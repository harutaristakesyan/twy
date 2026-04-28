// CloudFront Functions viewer-request handler.
// CRITICAL: this function must be named exactly `handler` — CloudFront's
// runtime invokes that exact identifier. Do not let lint auto-fixes rename
// it to `_handler` (biome's noUnusedVariables previously did this and
// silently broke prod). Code is intentionally ES5-style to work on both
// cloudfront-js-1.0 and cloudfront-js-2.0; do not auto-fix to optional
// chaining or template literals — see biome.json override for this file.
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var headers = request.headers;

  // Remove 'www.' if present
  if (headers.host && headers.host.value.startsWith("www.")) {
    var newHost = headers.host.value.slice(4);
    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: {
        location: {
          value: "https://" + newHost + uri,
        },
      },
    };
  }

  if (uri.startsWith("/logos/")) return request;

  if (uri.endsWith("/")) {
    request.uri += "index.html";
  } else if (!uri.includes(".")) {
    request.uri += ".html";
  }

  return request;
}
