import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { Resend } from 'https://esm.sh/resend@4.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

// Generate Eclipse branded HTML email template for password reset
function generatePasswordResetEmailHtml(token: string): string {
  // Create individual digit cells for the 4-digit code
  const digitCells = token.split('').map(digit => `
    <td style="width: 48px; height: 56px; background: #1a1520; border: 2px solid #a855f7; border-radius: 8px; text-align: center; vertical-align: middle; margin: 0 4px;">
      <span style="font-size: 28px; font-weight: 700; color: #a855f7; font-family: 'Courier New', Courier, monospace;">${digit}</span>
    </td>
  `).join('<td style="width: 8px;"></td>')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Eclipse Password Reset</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0f;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 420px; background: linear-gradient(180deg, #151518 0%, #0d0d10 100%); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 16px; overflow: hidden;">
          
          <!-- Header with gradient accent -->
          <tr>
            <td style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%); padding: 24px 24px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <!-- Eclipse Logo -->
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%); width: 40px; height: 40px; border-radius: 10px; text-align: center; vertical-align: middle;">
                          <span style="font-size: 20px; font-weight: 800; color: #ffffff; font-family: Georgia, serif;">E</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <span style="font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 2px; font-family: Georgia, serif;">ECLIPSE</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Lock Icon -->
          <tr>
            <td align="center" style="padding: 20px 24px 12px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 56px; height: 56px; background: rgba(168, 85, 247, 0.1); border: 2px solid rgba(168, 85, 247, 0.3); border-radius: 50%; text-align: center; vertical-align: middle;">
                    <span style="font-size: 24px;">&#128274;</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Heading -->
          <tr>
            <td align="center" style="padding: 0 24px 8px;">
              <h1 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0; font-family: Georgia, serif;">Reset Your Password</h1>
            </td>
          </tr>
          
          <!-- Body Text -->
          <tr>
            <td align="center" style="padding: 0 24px 24px;">
              <p style="font-size: 14px; line-height: 22px; color: #a3a3a3; margin: 0;">Enter the code below to reset your password. If you did not request this, please ignore this email.</p>
            </td>
          </tr>
          
          <!-- Code Label -->
          <tr>
            <td align="center" style="padding: 0 24px 8px;">
              <p style="font-size: 11px; color: #737373; margin: 0; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Your verification code</p>
            </td>
          </tr>
          
          <!-- Code Digits -->
          <tr>
            <td align="center" style="padding: 0 24px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  ${digitCells}
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Timer notice -->
          <tr>
            <td align="center" style="padding: 0 24px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.25); border-radius: 6px; padding: 8px 14px;">
                    <span style="font-size: 12px; color: #eab308;">&#9202; Expires in 15 minutes</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-top: 1px solid rgba(168, 85, 247, 0.15);"></td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 20px 24px 24px;">
              <p style="font-size: 12px; color: #525252; margin: 0 0 14px 0;">If you didn't request this email, you can safely ignore it.</p>
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding-right: 16px;">
                    <a href="https://eclipserblx.com" style="font-size: 11px; color: #a855f7; text-decoration: none;">Website</a>
                  </td>
                  <td style="border-left: 1px solid #333; padding-left: 16px; padding-right: 16px;">
                    <a href="https://eclipserblx.com/support" style="font-size: 11px; color: #a855f7; text-decoration: none;">Support</a>
                  </td>
                  <td style="border-left: 1px solid #333; padding-left: 16px;">
                    <a href="https://eclipserblx.com/privacy-policy" style="font-size: 11px; color: #a855f7; text-decoration: none;">Privacy</a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 10px; color: #404040; margin: 16px 0 0 0;">&copy; 2025 Eclipse. Premium Roblox assets for UK roleplay.</p>
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

// Generate a 4-digit code
function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
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
