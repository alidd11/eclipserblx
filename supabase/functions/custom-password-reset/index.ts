import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { Resend } from 'https://esm.sh/resend@4.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

// Generate Eclipse branded HTML email template for password reset
function generatePasswordResetEmailHtml(token: string): string {
  const formattedToken = token.split('').join(' ')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Eclipse Password Reset</title>
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
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="none" stroke="#10b981" stroke-width="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke="#10b981" stroke-width="2"/>
                </svg>
              </div>
            </td>
          </tr>
          
          <tr>
            <td align="center" style="padding: 0 40px 12px;">
              <h1 style="font-size: 26px; font-weight: 700; color: #ffffff; margin: 0; font-family: 'Cinzel', Georgia, serif;">Reset Your Password</h1>
            </td>
          </tr>
          
          <!-- Body Text -->
          <tr>
            <td align="center" style="padding: 0 40px 28px;">
              <p style="font-size: 15px; line-height: 24px; color: #a3a3a3; margin: 0;">Enter the code below to reset your password. If you did not request this, please ignore this email.</p>
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
                    <span style="font-size: 13px; color: #eab308;">⏱ This code expires in 15 minutes</span>
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

// Generate a 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })

  const url = new URL(req.url)
  const action = url.pathname.split('/').pop()

  try {
    if (action === 'request') {
      // Request password reset - generate OTP and send email
      const { email } = await req.json()
      
      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Password reset requested for: ${email}`)

      // Check if user exists by looking up in profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email.toLowerCase())
        .single()

      // Always return success even if user doesn't exist (security best practice)
      if (!profile) {
        console.log('User not found, returning success anyway for security')
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Invalidate any existing codes for this email
      await supabase
        .from('password_reset_codes')
        .update({ used: true })
        .eq('email', email.toLowerCase())
        .eq('used', false)

      // Generate new code
      const code = generateCode()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

      // Store the code
      const { error: insertError } = await supabase
        .from('password_reset_codes')
        .insert({
          email: email.toLowerCase(),
          code,
          expires_at: expiresAt.toISOString(),
        })

      if (insertError) {
        console.error('Failed to store reset code:', insertError)
        throw new Error('Failed to process request')
      }

      // Send the email
      const html = generatePasswordResetEmailHtml(code)
      const { error: emailError } = await resend.emails.send({
        from: 'Eclipse <noreply@eclipserblx.com>',
        to: [email],
        subject: 'Reset your Eclipse password',
        html,
      })

      if (emailError) {
        console.error('Failed to send email:', emailError)
        throw new Error('Failed to send email')
      }

      console.log('Password reset email sent successfully')
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else if (action === 'verify') {
      // Verify OTP and reset password
      const { email, code, newPassword } = await req.json()

      if (!email || !code || !newPassword) {
        return new Response(
          JSON.stringify({ error: 'Email, code, and new password are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Verifying password reset for: ${email}`)

      // Find valid code
      const { data: resetCode, error: fetchError } = await supabase
        .from('password_reset_codes')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('code', code)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (fetchError || !resetCode) {
        console.log('Invalid or expired code')
        return new Response(
          JSON.stringify({ error: 'Invalid or expired code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Mark code as used
      await supabase
        .from('password_reset_codes')
        .update({ used: true })
        .eq('id', resetCode.id)

      // Get user by email from auth.users
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
      
      if (listError) {
        console.error('Failed to list users:', listError)
        throw new Error('Failed to process request')
      }

      const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

      if (!user) {
        console.error('User not found in auth.users')
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update the user's password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      )

      if (updateError) {
        console.error('Failed to update password:', updateError)
        throw new Error('Failed to update password')
      }

      console.log('Password reset successful')
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in custom-password-reset:', error)
    return new Response(
      JSON.stringify({ error: 'An error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
