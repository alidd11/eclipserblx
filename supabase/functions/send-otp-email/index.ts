import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

function generateOtpEmailHtml(token: string, email_action_type: string): string {
  const getHeaderText = () => {
    switch (email_action_type) {
      case 'signup':
        return 'Verify your email'
      case 'recovery':
        return 'Reset your password'
      case 'email_change':
        return 'Confirm email change'
      default:
        return 'Verification code'
    }
  }

  const getBodyText = () => {
    switch (email_action_type) {
      case 'signup':
        return "Enter the code below to verify your email and finish signing up."
      case 'recovery':
        return 'Use this code to reset your password. If you didn\'t request this, just ignore this email.'
      case 'email_change':
        return 'Use this code to confirm your new email address.'
      default:
        return 'Use this code to continue.'
    }
  }

  const formattedToken = token.split('').join(' ')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0f;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="480" cellspacing="0" cellpadding="0" style="max-width: 480px;">
          <tr>
            <td style="padding-bottom: 32px;">
              <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 2px; font-family: Georgia, serif;">ECLIPSE</span>
            </td>
          </tr>
          <tr>
            <td>
              <h1 style="font-size: 22px; font-weight: 600; color: #ffffff; margin: 0 0 16px 0;">${getHeaderText()}</h1>
              <p style="font-size: 15px; color: #a3a3a3; line-height: 1.6; margin: 0 0 28px 0;">${getBodyText()}</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 28px;">
              <table cellspacing="0" cellpadding="0" style="background: #1a1a1f; border: 1px solid #333;">
                <tr>
                  <td style="padding: 18px 32px;">
                    <span style="font-size: 34px; font-weight: 800; color: #a855f7; letter-spacing: 10px; font-family: 'SF Mono', Monaco, Consolas, monospace;">${formattedToken}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <p style="font-size: 13px; color: #737373; margin: 0 0 32px 0;">This code expires in 10 minutes.</p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #222; padding-top: 24px;">
              <p style="font-size: 13px; color: #525252; margin: 0 0 8px 0;">If you didn't request this, you can safely ignore it.</p>
              <p style="font-size: 11px; color: #404040; margin: 0;">Eclipse &middot; <a href="https://eclipserblx.com" style="color: #737373; text-decoration: none;">eclipserblx.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

function getSubject(email_action_type: string): string {
  switch (email_action_type) {
    case 'signup':
      return 'Verify your email to join Eclipse'
    case 'recovery':
      return 'Reset your Eclipse password'
    case 'email_change':
      return 'Confirm your new email address'
    default:
      return 'Your Eclipse verification code'
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)
  
  console.log('Received OTP email request')
  
  const wh = new Webhook(hookSecret)
  
  try {
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as {
      user: {
        email: string
      }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
        site_url: string
        token_new: string
        token_hash_new: string
      }
    }

    console.log(`Sending OTP email to ${user.email} for action: ${email_action_type}`)

    const html = generateOtpEmailHtml(token, email_action_type)

    const { error } = await resend.emails.send({
      from: 'Eclipse <noreply@eclipserblx.com>',
      to: [user.email],
      subject: getSubject(email_action_type),
      html,
    })

    if (error) {
      console.error('Failed to send email:', error)
      throw error
    }

    console.log('OTP email sent successfully')

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('Error in send-otp-email function:', error)
    const err = error as { code?: number; message?: string }
    return new Response(
      JSON.stringify({
        error: {
          http_code: err.code || 500,
          message: err.message || 'Unknown error',
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})