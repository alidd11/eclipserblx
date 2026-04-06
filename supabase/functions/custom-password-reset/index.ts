import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_VERIFY_ATTEMPTS = 5; // Lock after 5 failed attempts

// Generate Eclipse branded HTML email template for password reset
function generatePasswordResetEmailHtml(token: string): string {
  // Validate token is exactly 4 digits before rendering
  if (!/^\d{4}$/.test(token)) return '';
  
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
          <tr>
            <td style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%); padding: 24px 24px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
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
          <tr>
            <td align="center" style="padding: 0 24px 8px;">
              <h1 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0; font-family: Georgia, serif;">Reset Your Password</h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 24px 24px;">
              <p style="font-size: 14px; line-height: 22px; color: #a3a3a3; margin: 0;">Enter the code below to reset your password. If you did not request this, please ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 24px 8px;">
              <p style="font-size: 11px; color: #737373; margin: 0; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Your verification code</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 24px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  ${digitCells}
                </tr>
              </table>
            </td>
          </tr>
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
          <tr>
            <td style="padding: 0 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-top: 1px solid rgba(168, 85, 247, 0.15);"></td>
                </tr>
              </table>
            </td>
          </tr>
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

// Generate a cryptographically stronger 6-digit code
function generateCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000)); // 6 digits: 100000-999999
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Rate limiting
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit({
    ...RATE_LIMITS.AUTH,
    identifier: clientIp,
    action: 'custom-password-reset',
  });

  if (!rateLimitResult.allowed) {
    console.log(`[custom-password-reset] Rate limit exceeded for IP: ${clientIp}`);
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })

  const url = new URL(req.url)
  const action = url.pathname.split('/').pop()

  // Only allow known actions
  if (action !== 'request' && action !== 'verify') {
    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    if (action === 'request') {
      const { email } = await req.json()

      if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email) || email.length > 255) {
        return new Response(
          JSON.stringify({ error: 'Valid email is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const normalizedEmail = email.trim().toLowerCase();
      console.log(`Password reset requested for: ${normalizedEmail}`)

      // Check if user exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', normalizedEmail)
        .single()

      // Always return success (security best practice - don't reveal if email exists)
      if (!profile) {
        console.log('User not found, returning success anyway for security')
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate 6-digit code with crypto RNG
      const code = generateCode()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

      // Store hashed code via RPC (invalidates existing codes too)
      const { error: insertError } = await supabase.rpc('store_password_reset_code', {
        p_email: normalizedEmail,
        p_code: code,
        p_expires_at: expiresAt.toISOString(),
      })

      if (insertError) {
        console.error('Failed to store reset code:', insertError)
        throw new Error('Failed to process request')
      }

      const html = generatePasswordResetEmailHtml(code)
      const { error: emailError } = await resend.emails.send({
        from: 'Eclipse <noreply@eclipserblx.com>',
        to: [normalizedEmail],
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
      const { email, code, newPassword } = await req.json()

      if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email) || email.length > 255) {
        return new Response(
          JSON.stringify({ error: 'Valid email is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
        return new Response(
          JSON.stringify({ error: 'Invalid code format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
        return new Response(
          JSON.stringify({ error: 'Password must be between 8 and 128 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const normalizedEmail = email.trim().toLowerCase();
      console.log(`Verifying password reset for: ${normalizedEmail}`)

      // Check attempt count on the most recent unused code for this email
      const { data: recentCode } = await supabase
        .from('password_reset_codes')
        .select('id, attempts')
        .eq('email', normalizedEmail)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!recentCode) {
        return new Response(
          JSON.stringify({ error: 'No active reset code found. Please request a new one.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if max attempts exceeded - invalidate code
      const currentAttempts = (recentCode as any).attempts ?? 0;
      if (currentAttempts >= MAX_VERIFY_ATTEMPTS) {
        // Burn the code
        await supabase
          .from('password_reset_codes')
          .update({ used: true })
          .eq('id', recentCode.id);

        console.warn(`[custom-password-reset] Max attempts exceeded for ${normalizedEmail}`);
        return new Response(
          JSON.stringify({ error: 'Too many failed attempts. Please request a new code.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Increment attempt counter BEFORE checking code (prevents timing attacks)
      await supabase
        .from('password_reset_codes')
        .update({ attempts: currentAttempts + 1 })
        .eq('id', recentCode.id);

      // Now verify the code
      const { data: resetCode, error: fetchError } = await supabase
        .from('password_reset_codes')
        .select('*')
        .eq('email', normalizedEmail)
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

      // Get user by email
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', normalizedEmail)
        .single()

      if (!userProfile) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userProfile.user_id,
        { password: newPassword }
      )

      if (updateError) {
        console.error('Failed to update password:', updateError)
        throw new Error('Failed to update password')
      }

      // Audit log
      await supabase.from('audit_logs').insert({
        user_id: userProfile.user_id,
        action: 'password_reset',
        resource: 'auth',
        details: { method: 'otp_code' },
      });

      console.log('Password reset successful')
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in custom-password-reset:', error)
    return new Response(
      JSON.stringify({ error: 'An error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})