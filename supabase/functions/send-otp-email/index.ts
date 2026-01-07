import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

// Generate Eclipse branded HTML email template
function generateOtpEmailHtml(token: string, email_action_type: string): string {
  const getHeaderText = () => {
    switch (email_action_type) {
      case 'signup':
        return 'Welcome to Eclipse'
      case 'recovery':
        return 'Reset Your Password'
      case 'email_change':
        return 'Confirm Email Change'
      default:
        return 'Verification Code'
    }
  }

  const getBodyText = () => {
    switch (email_action_type) {
      case 'signup':
        return "You're just one step away from accessing premium gaming assets. Enter the code below to verify your email and complete your registration."
      case 'recovery':
        return 'Enter the code below to reset your password. If you did not request this, please ignore this email.'
      case 'email_change':
        return 'Enter the code below to confirm your new email address.'
      default:
        return 'Enter the code below to continue.'
    }
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Eclipse Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="480" cellspacing="0" cellpadding="0" style="max-width: 480px;">
          
          <!-- Logo Section -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <svg viewBox="0 0 100 100" width="60" height="60" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="eclipseGlow" cx="70%" cy="50%" r="60%">
                    <stop offset="0%" stop-color="#8B5CF6" stop-opacity="0.8"/>
                    <stop offset="50%" stop-color="#8B5CF6" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
                  </radialGradient>
                  <radialGradient id="moonGradient" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stop-color="#262626"/>
                    <stop offset="100%" stop-color="#0d0d0d"/>
                  </radialGradient>
                </defs>
                <circle cx="50" cy="50" r="48" fill="url(#eclipseGlow)"/>
                <circle cx="50" cy="50" r="40" fill="url(#moonGradient)" stroke="#8B5CF6" stroke-width="1" stroke-opacity="0.5"/>
                <path d="M 85 50 A 35 35 0 0 1 50 85 A 45 45 0 0 0 85 50" fill="none" stroke="#8B5CF6" stroke-width="2" stroke-opacity="0.8"/>
                <ellipse cx="82" cy="50" rx="5" ry="35" fill="#8B5CF6" fill-opacity="0.3"/>
              </svg>
              <p style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: 4px; margin: 12px 0 0 0;">ECLIPSE</p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 0 24px 0;">
              <hr style="border: none; border-top: 1px solid #262626; margin: 0;">
            </td>
          </tr>
          
          <!-- Heading -->
          <tr>
            <td align="center">
              <h1 style="font-size: 28px; font-weight: 600; color: #ffffff; margin: 0 0 16px 0;">${getHeaderText()}</h1>
            </td>
          </tr>
          
          <!-- Body Text -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <p style="font-size: 16px; line-height: 24px; color: #a3a3a3; margin: 0;">${getBodyText()}</p>
            </td>
          </tr>
          
          <!-- Code Section -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <p style="font-size: 14px; color: #737373; margin: 0 0 12px 0;">Your verification code:</p>
              <div style="background-color: #171717; border: 2px solid #8B5CF6; border-radius: 12px; padding: 20px 32px; display: inline-block;">
                <p style="font-size: 36px; font-weight: 700; color: #8B5CF6; letter-spacing: 8px; margin: 0; font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', monospace;">${token}</p>
              </div>
            </td>
          </tr>
          
          <!-- Expiry Text -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <p style="font-size: 14px; color: #525252; margin: 0;">This code will expire in 10 minutes.</p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 0 24px 0;">
              <hr style="border: none; border-top: 1px solid #262626; margin: 0;">
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center">
              <p style="font-size: 14px; color: #525252; margin: 0 0 8px 0;">If you didn't request this email, you can safely ignore it.</p>
              <p style="font-size: 12px; color: #404040; margin: 0;">© 2025 Eclipse. All rights reserved.</p>
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
      from: 'Eclipse <noreply@eclipse-store.co.uk>',
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
