export const emailTemplate = `<html lang="en">
<head><meta charset="UTF-8"><title>Verify Your Email</title></head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 40px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
    <tr><td style="padding: 24px 32px;">
      <h2 style="margin: 0 0 16px; color: #333333;">Verify your email address</h2>
      <p style="font-size: 15px; color: #555555; line-height: 1.5;">
        Hello! Thank you for signing up. To complete your registration, please use the verification code below:
      </p>
      <div style="margin: 24px 0; text-align: center;">
        <div style="display: inline-block; padding: 12px 20px; font-size: 24px; font-weight: bold; color: #000000; background-color: rgba(7,247,255,0.68); border-radius: 6px; letter-spacing: 2px;" id="verification-code">{####}</div>
      </div>
      <p style="font-size: 13px; color: #888888; text-align: center; margin-top: -8px;">
        You can select and copy the code above manually.
      </p>
      <p style="margin-top: 32px; font-size: 14px; color: #aaaaaa;">
        — The TWY Team
      </p>
    </td></tr>
  </table>
</body>
</html>`;
