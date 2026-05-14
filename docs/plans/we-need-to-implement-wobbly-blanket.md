# TWY-24 — Centralize file upload/download into `@/features/files`

## Context

File upload is foundational across the product (loads, payment orders, office expenses, invoices) but every consumer reimplements the same AntD `Upload` + `fileApi.uploadFile` orchestration. The implementations have already diverged in ways that cause real bugs:

- **Orphaned files in S3 and DB.** `LoadEditModal` and `CreateLoadPage` upload files via presigned URL but never clean them up when the user cancels — `file` rows and S3 objects accumulate forever.
- **Inconsistent caps and validation.** `CreateOfficeExpenseModal` enforces a 20-file cap via a local constant kept "in sync" with `CreateOfficeExpenseEventSchema` by comment only. No callsite pre-validates MIME or size client-side.
- **Single-file DELETE is unscoped.** `DELETE /api/files/{fileId}` deletes the S3 object without an ownership check and never removes the DB row.
- **`documentCategory` exists in schema but is dead.** Every file is uploaded with `documentCategory: null`.

This change consolidates upload/download into a single `apps/dashboard/src/features/files/` module that owns the lifecycle (including cancel-cleanup), hardens the backend (`POST /api/files/batch-delete`, ownership check on single delete, `documentCategory` accepted on init), and migrates all six known callsites to the new module in one PR.

After this change, a new feature that needs file attachments is `<FileUploader value={fileIds} onChange={setFileIds} />` + sending `fileIds` in its DTO — nothing else.

## Decisions

- **Constants:** Duplicated client-side (`apps/dashboard/src/features/files/constants.ts`) and server-side (`packages/core/src/file/constants.ts`) with cross-reference comments. No new workspace package.
- **PR breakdown:** One unified PR.
- **DocumentCategory:** Optional prop on `FileUploader` (no per-file picker UI). Passed through to upload init and persisted on the `file` row.
- **Busy state:** Derived from the controlled `value` (`items.some(i => i.status === "uploading")`), so the submit button re-renders reactively.
- **Load `files` shape mismatch:** Adapt at the consumer (map `fileIds → [{ id }]` in `LoadEditModal`/`CreateLoadPage` `onFinish`). No backend schema change.
- **Fix `DELETE /api/files/{fileId}` gap in this PR:** Add `createdBy = caller` ownership check + delete the DB row.

## Module structure — `apps/dashboard/src/features/files/`

```
constants.ts                    MAX_FILES_DEFAULT, MAX_FILE_SIZE_BYTES, ACCEPTED_MIME_GROUPS, DOCUMENT_CATEGORY_LABELS
types.ts                        UploadedFile, FileUploaderValueItem, FileUploadStatus
api/filesApi.ts                 requestUploadUrl, uploadToS3, uploadFile(file, documentCategory?),
                                getDownloadUrl, deleteFile, batchDeleteFiles, downloadFile
hooks/useFileUpload.ts          commit/cancel state machine — the heart of the change
hooks/useFileDownload.ts        wraps filesApi.downloadFile with loading + error toast
components/FileUploader.tsx     controlled AntD Upload, Form.Item-compatible
components/FileList.tsx         read-only display, uses FileDownloadButton
components/FileDownloadButton.tsx
index.ts                        public barrel (only documented entry point)
```

Justification for the barrel (deviates from per-feature convention): this is a horizontal capability with many entry points. Document in the PR description.

### Hook API — `useFileUpload`

```ts
interface UseFileUploadArgs {
  documentCategory?: DocumentCategory;
  max?: number;                                  // default MAX_FILES_DEFAULT
  maxSizeBytes?: number;                         // default MAX_FILE_SIZE_BYTES
  acceptedMimeTypes?: readonly string[];
  initial?: FileUploaderValueItem[];             // for edit flows
}

interface UseFileUploadResult {
  items: FileUploaderValueItem[];
  fileIds: string[];                             // memoized, only "done" items
  isBusy: boolean;                               // items.some(i => i.status === "uploading")
  upload: (file: File) => Promise<string | null>;
  remove: (uid: string) => void;
  reset: () => void;
  commit: () => void;                            // flips committedRef — prevents unmount cleanup
  beforeUpload: UploadProps["beforeUpload"];
  customRequest: UploadProps["customRequest"];
  onChange: UploadProps["onChange"];
  onRemove: UploadProps["onRemove"];
  fileListForAntd: UploadFile[];
}
```

**Cleanup contract** (the orphan-fix):

```ts
const committedRef = useRef(false);
const uploadedIdsRef = useRef<Set<string>>(new Set());

useEffect(() => () => {
  if (committedRef.current) return;
  const ids = [...uploadedIdsRef.current];
  if (ids.length === 0) return;
  void filesApi.batchDeleteFiles(ids);          // fire-and-forget
}, []);                                          // empty deps — refs are stable
```

Consumer calls `commit()` in `onSuccess`. All current callsites use `destroyOnHidden`, so cancel = unmount = cleanup fires automatically.

### Component API — `FileUploader`

```tsx
interface FileUploaderProps {
  value?: FileUploaderValueItem[];               // controlled by AntD Form
  onChange?: (items: FileUploaderValueItem[]) => void;
  documentCategory?: DocumentCategory;
  max?: number;
  maxSizeBytes?: number;
  acceptedMimeTypes?: readonly string[];
  controlRef?: React.Ref<FileUploaderHandle>;    // { commit, fileIds }
  disabled?: boolean;
  buttonLabel?: string;
}

interface FileUploaderHandle {
  commit: () => void;
  fileIds: string[];
}
```

Parent derives `isBusy` from `Form.useWatch("files", form)` — reactive, re-renders the submit button automatically.

AntD 6 notes: use `customRequest` (not `action`), `App.useApp().message` (not the deprecated singleton), `listType="text"`, no collapsed `showSearch`/`filterOption` props.

## Backend changes

### Schema (`packages/core/src/file/`)

**New `constants.ts`:**
```ts
// KEEP IN SYNC WITH apps/dashboard/src/features/files/constants.ts
export const MAX_UPLOAD_FILE_SIZE_BYTES = 100 * 1024 * 1024;
export const MAX_BATCH_DELETE_FILE_IDS = 50;
```

**Edit `request.ts`:**
- `UploadFilePayloadSchema.size.max` → `MAX_UPLOAD_FILE_SIZE_BYTES`
- `UploadFilePayloadSchema.documentCategory: z.enum(documentCategoryValues).optional()`
- New `BatchDeleteFilesEventSchema` with body `{ fileIds: z.array(z.uuid()).min(1).max(MAX_BATCH_DELETE_FILE_IDS) }`

### Service (`packages/core/src/file/service.ts`)

- `createUploadUrl`: extend `CreateUploadUrlInput` with `documentCategory?: DocumentCategory`; write it on the `file` row insert.
- **`deleteFile` becomes `deleteOwnedFile({ fileId, callerUserId })`:** ownership check (`SELECT id FROM file WHERE id = $1 AND created_by = $2`), then S3 `DeleteObject` + DB row delete in a single tx. Throws 404 if not owned. **Update existing `DELETE /api/files/{fileId}` handler to use it.**
- New `batchDeleteFiles({ fileIds, callerUserId })`: `SELECT` owned subset, then for each owned id: S3 delete + DB row delete. Returns `{ deleted: string[] }`. Caller-scoped; silently skips non-owned ids.

### Handler + route

- New `packages/functions/src/api/file/batchDelete.ts` — `middyfy(handler, { eventSchema: BatchDeleteFilesEventSchema, mode: "parse" })`.
- Edit `packages/functions/src/api/file/delete.ts` to call `deleteOwnedFile` and pass `event.requestContext.authUser.userId`.
- Append to `infra/routes.ts`:
  ```ts
  {
    handler: "packages/functions/src/api/file/batchDelete.handler",
    routeKey: "POST /api/files/batch-delete",
    requiresAuth: true,
    linkKeys: ["cluster", "filesBucket"],
  },
  ```

### FK verification

Before merging, confirm `loadFiles`, `paymentOrderFiles`, `officeExpensePaymentOrderFiles` cascade or restrict on `file.id` delete:
- `packages/db/src/schema/load.ts` — `loadFiles.fileId` references
- `packages/db/src/schema/paymentOrder.ts` — `paymentOrderFiles.fileId` references
- `packages/db/src/schema/officeExpensePaymentOrder.ts` — `officeExpensePaymentOrderFiles.fileId` references

Orphans (cancel path) are never linked, so this is mostly safe — but `deleteOwnedFile` must swallow `foreign_key_violation` gracefully (return 409 with a clear message) so a user can't accidentally delete a still-linked file.

## Callsite migrations

| File | Change |
|---|---|
| `apps/dashboard/src/features/load/components/LoadEditModal.tsx` (lines 261–283, 499–524) | Replace `handleFileUpload`, `handleFileRemove`, `activeUploadCount`, `fileList`, `uploadedFiles` state with `<FileUploader controlRef={uploaderRef} />`. Adapt at submit: `files: uploaderRef.current?.fileIds.map(id => ({ id })) ?? []`. Call `commit()` in `onSuccess`. |
| `apps/dashboard/src/features/load/pages/CreateLoadPage.tsx` | Same pattern as `LoadEditModal`. |
| `apps/dashboard/src/features/accounting/components/CreateOfficeExpenseModal.tsx` (lines 88–162) | Delete `MAX_CREATE_FILES`, `inFlightCount`, `beforeUpload`, `customRequest`, `handleChange`, `handleRemove`, `cleanupUploadedFiles`, `collectUploadedIds`. Replace with `<FileUploader controlRef={uploaderRef} max={MAX_FILES_DEFAULT} />`. Pass `fileIds` directly in the create DTO. Preserves 20-file cap (`MAX_FILES_DEFAULT === 20`). |
| `apps/dashboard/src/features/accounting/api/paymentOrderApi.ts` `addInvoice` / `downloadInvoice` | Keep functions in place (domain-specific link flow). Change import: `@/libs/fileApi` → `@/features/files` (`filesApi`). |
| `apps/dashboard/src/features/accounting/api/officeExpensePaymentOrderApi.ts` `addFile` / `downloadFile` | Same as above. |
| `apps/dashboard/src/features/accounting/hooks/useInternalExpandedLoads.tsx` | Replace inline `<Button onClick={() => fileApi.downloadFile(...)}>` with `<FileDownloadButton fileId={inv.fileId} fileName={inv.fileName} type="link" size="small" />`. |
| `apps/dashboard/src/features/load/components/useLoadColumns.tsx:67` | Migrate `fileApi.downloadFile` → `filesApi.downloadFile`. |
| `apps/dashboard/src/libs/fileApi.ts` | **Delete.** Grep confirms zero remaining importers before deletion. |

## Tests (Vitest)

- `apps/dashboard/src/features/files/hooks/useFileUpload.test.ts`
  - commit path → no batchDelete on unmount
  - cancel path → batchDelete called with all uploaded ids on unmount
  - empty unmount → no call
  - size cap rejection (warning toast, no network call)
  - MIME whitelist rejection
  - cap enforcement (synchronous `inFlightCount` gate)
  - concurrent counter (`isBusy` true while uploads pending)
  - failed upload → item removed, `uploadedIdsRef` not populated
- `apps/dashboard/src/features/files/components/FileUploader.test.tsx`
  - controlled value lifecycle (`uploading` → `done`)
  - `commit()` via ref prevents cleanup
  - `max` enforcement UX
- `packages/functions/src/api/file/batchDelete.test.ts`
  - userId propagated from `event.requestContext.authUser`
  - empty array rejected (schema `min(1)`)
  - >50 ids rejected
- `packages/core/src/file/service.test.ts` (extend if exists, otherwise create)
  - `batchDeleteFiles` filters by `created_by`
  - `deleteOwnedFile` 404s on non-owned id
  - foreign-key violation surfaced as 409, not 500

## Critical files

**New:**
- `apps/dashboard/src/features/files/{constants.ts, types.ts, index.ts}`
- `apps/dashboard/src/features/files/api/filesApi.ts`
- `apps/dashboard/src/features/files/hooks/{useFileUpload.ts, useFileDownload.ts}`
- `apps/dashboard/src/features/files/components/{FileUploader.tsx, FileList.tsx, FileDownloadButton.tsx}`
- `packages/core/src/file/constants.ts`
- `packages/functions/src/api/file/batchDelete.ts`

**Edit:**
- `packages/core/src/file/{request.ts, service.ts, index.ts}`
- `packages/functions/src/api/file/{upload.ts, delete.ts}`
- `packages/db/src/schema/file.ts` (verify `documentCategory` column already exists — should be no-op)
- `infra/routes.ts`
- All 8 callsites listed above

**Delete:**
- `apps/dashboard/src/libs/fileApi.ts`

## Verification

1. `pnpm check:ci` — Biome clean.
2. `pnpm --filter @twy/db build && pnpm --filter @twy/core build && pnpm --filter @twy/functions build && pnpm --filter @twy/dashboard build` — all green, no deprecation warnings.
3. `pnpm test` — all packages green.
4. `pnpm sst dev --stage <user>` — new `POST /api/files/batch-delete` route deploys.
5. Manual repro — orphan fix: open `LoadEditModal`, upload 2 files, click Cancel. Verify in AWS Console + via `psql` that S3 keys and `file` table rows are both gone.
6. Manual repro — cap: open `CreateOfficeExpenseModal`, attempt 21 files → 21st rejected with warning. Upload 20 + submit → success.
7. Manual repro — download: in billing internal-expanded rows, click a `FileDownloadButton` → file downloads, button shows brief loading state.
8. Manual repro — busy gate: upload a file, click Submit → disabled until upload completes.
9. Manual repro — `documentCategory`: upload a file via `<FileUploader documentCategory="pod" />`, verify `psql -c "select id, document_category from file order by created_at desc limit 1"` returns `pod`.
10. Manual repro — ownership check: `curl -X DELETE /api/files/<someone-elses-file-id>` returns 404.
11. Run `code-reviewer` subagent on the diff.
12. Run `security-auditor` subagent — confirm `batchDelete` and `deleteOwnedFile` both scope by `created_by`.
