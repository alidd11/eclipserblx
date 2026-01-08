import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

// Generate Eclipse branded HTML email template with Jade & Obsidian theme
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
        return "You're just one step away from accessing premium Roblox assets for UK roleplay. Enter the code below to verify your email and complete your registration."
      case 'recovery':
        return 'Enter the code below to reset your password. If you did not request this, please ignore this email.'
      case 'email_change':
        return 'Enter the code below to confirm your new email address.'
      default:
        return 'Enter the code below to continue.'
    }
  }

  const getIcon = () => {
    switch (email_action_type) {
      case 'signup':
        return `<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#10b981" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
      case 'recovery':
        return `<rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="none" stroke="#10b981" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke="#10b981" stroke-width="2"/>`
      default:
        return `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round"/><polyline points="22 4 12 14.01 9 11.01" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
    }
  }

  // Format token with spaces for readability
  const formattedToken = token.split('').join(' ')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Eclipse Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #050505;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="520" cellspacing="0" cellpadding="0" style="max-width: 520px; background: linear-gradient(180deg, #0f0f0f 0%, #0a0a0a 100%); border: 1px solid #1a1a1a; border-radius: 16px; overflow: hidden;">
          
          <!-- Header with gradient accent -->
          <tr>
            <td style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 50%, transparent 100%); padding: 32px 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <!-- Eclipse Logo - PWA Icon -->
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="text-align: center; vertical-align: middle;">
                          <img src="https://d330fb3c-8e4c-4ae9-8517-806e609eff0f.lovableproject.com/apple-touch-icon.png" alt="Eclipse" width="56" height="56" style="display: block; border-radius: 12px;">
                        </td>
                        <td style="padding-left: 14px;">
                          <span style="font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: 3px; font-family: 'Cinzel', Georgia, serif;">ECLIPSE</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Icon & Heading -->
          <tr>
            <td align="center" style="padding: 24px 40px 16px;">
              <div style="width: 64px; height: 64px; background: rgba(16, 185, 129, 0.1); border: 2px solid rgba(16, 185, 129, 0.3); border-radius: 50%; display: inline-block; line-height: 60px; text-align: center;">
                <svg viewBox="0 0 24 24" width="28" height="28" style="vertical-align: middle; margin-top: 16px;" xmlns="http://www.w3.org/2000/svg">
                  ${getIcon()}
                </svg>
              </div>
            </td>
          </tr>
          
          <tr>
            <td align="center" style="padding: 0 40px 12px;">
              <h1 style="font-size: 26px; font-weight: 700; color: #ffffff; margin: 0; font-family: 'Cinzel', Georgia, serif;">${getHeaderText()}</h1>
            </td>
          </tr>
          
          <!-- Body Text -->
          <tr>
            <td align="center" style="padding: 0 40px 28px;">
              <p style="font-size: 15px; line-height: 24px; color: #a3a3a3; margin: 0;">${getBodyText()}</p>
            </td>
          </tr>
          
          <!-- Code Box -->
          <tr>
            <td align="center" style="padding: 0 40px 12px;">
              <p style="font-size: 13px; color: #737373; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">Your verification code</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 40px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #0f1f1a 0%, #0a1412 100%); border: 2px solid #10b981; border-radius: 12px; box-shadow: 0 0 30px rgba(16, 185, 129, 0.15), inset 0 1px 0 rgba(255,255,255,0.05);">
                <tr>
                  <td style="padding: 20px 36px;">
                    <span style="font-size: 38px; font-weight: 800; color: #10b981; letter-spacing: 12px; font-family: 'SF Mono', Monaco, 'Roboto Mono', Consolas, monospace; text-shadow: 0 0 20px rgba(16, 185, 129, 0.5);">${formattedToken}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Timer notice -->
          <tr>
            <td align="center" style="padding: 0 40px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.2); border-radius: 8px; padding: 10px 16px;">
                    <span style="font-size: 13px; color: #eab308;">⏱ This code expires in 10 minutes</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: none; border-top: 1px solid #1f1f1f; margin: 0;">
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 40px 32px;">
              <p style="font-size: 13px; color: #525252; margin: 0 0 16px 0;">If you didn't request this email, you can safely ignore it.</p>
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding-right: 20px;">
                    <a href="https://eclipserblx.com" style="font-size: 12px; color: #10b981; text-decoration: none;">Website</a>
                  </td>
                  <td style="border-left: 1px solid #333; padding-left: 20px; padding-right: 20px;">
                    <a href="https://eclipserblx.com/support" style="font-size: 12px; color: #10b981; text-decoration: none;">Support</a>
                  </td>
                  <td style="border-left: 1px solid #333; padding-left: 20px;">
                    <a href="https://eclipserblx.com/privacy-policy" style="font-size: 12px; color: #10b981; text-decoration: none;">Privacy</a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 11px; color: #404040; margin: 20px 0 0 0;">© 2025 Eclipse. Premium Roblox assets for UK roleplay.</p>
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
