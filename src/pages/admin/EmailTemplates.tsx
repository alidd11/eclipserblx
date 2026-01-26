import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, ShieldCheck, Package, Store, UserCheck, Bot, Key, MessageSquare } from "lucide-react";

// Sample data for previews
const sampleData = {
  otp: { token: "123456", email_action_type: "signup" },
  passwordReset: { code: "4829" },
  orderConfirmation: {
    customerEmail: "customer@example.com",
    orderId: "ORD-ABC123",
    orderDate: new Date().toISOString(),
    items: [
      { name: "Premium Discord Bot", price: 29.99 },
      { name: "Custom Scripts Pack", price: 14.99 }
    ],
    subtotal: 44.98,
    discount: 5.00,
    total: 39.98
  },
  storeDeactivation: {
    storeName: "Example Store",
    ownerName: "John Doe",
    reason: "Violation of marketplace terms - selling prohibited items"
  },
  storeReactivation: {
    storeName: "Example Store",
    ownerName: "John Doe"
  },
  applicationConfirmation: {
    applicantName: "Jane Smith",
    position: "Content Moderator"
  },
  applicationStatus: {
    applicantName: "Jane Smith",
    position: "Content Moderator",
    status: "accepted"
  },
  botStatus: {
    customerEmail: "customer@example.com",
    productName: "Premium Moderation Bot",
    installationCode: "BOT-XYZ789",
    status: "completed",
    discordGuildName: "My Gaming Server"
  }
};

// OTP Email Template
function OtpEmailTemplate({ token, actionType }: { token: string; actionType: string }) {
  const formattedToken = token.split('').join(' ');
  
  const getActionContent = () => {
    switch (actionType) {
      case 'signup':
        return { title: 'Verify Your Email', icon: '✉️', message: 'Welcome to Eclipse! Please use the verification code below to complete your signup.' };
      case 'recovery':
        return { title: 'Reset Your Password', icon: '🔐', message: 'We received a request to reset your password. Use the code below to proceed.' };
      case 'email_change':
        return { title: 'Confirm Email Change', icon: '📧', message: 'Please verify your new email address using the code below.' };
      default:
        return { title: 'Verification Code', icon: '🔑', message: 'Use the code below to verify your identity.' };
    }
  };

  const content = getActionContent();

  return (
    <div style={{ margin: 0, padding: 0, backgroundColor: '#0a0a0a', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td align="center" style={{ padding: '40px 20px' }}>
              <table style={{ width: '100%', maxWidth: '600px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', padding: '30px 40px', borderRadius: '12px 12px 0 0', textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '10px' }}>{content.icon}</div>
                      <h1 style={{ margin: 0, color: '#ffffff', fontSize: '24px', fontWeight: 700 }}>{content.title}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ backgroundColor: '#18181b', padding: '40px', borderRadius: '0 0 12px 12px' }}>
                      <p style={{ margin: '0 0 30px', color: '#e4e4e7', fontSize: '16px', lineHeight: 1.6, textAlign: 'center' }}>{content.message}</p>
                      <div style={{ backgroundColor: '#27272a', borderRadius: '8px', padding: '20px', textAlign: 'center', marginBottom: '30px' }}>
                        <p style={{ margin: '0 0 10px', color: '#a1a1aa', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Your verification code</p>
                        <p style={{ margin: 0, color: '#ffffff', fontSize: '32px', fontWeight: 700, letterSpacing: '8px', fontFamily: 'monospace' }}>{formattedToken}</p>
                      </div>
                      <p style={{ margin: 0, color: '#71717a', fontSize: '14px', textAlign: 'center' }}>This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Password Reset Template
function PasswordResetTemplate({ code }: { code: string }) {
  return (
    <div style={{ margin: 0, padding: 0, backgroundColor: '#0a0a0a', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td align="center" style={{ padding: '40px 20px' }}>
              <table style={{ width: '100%', maxWidth: '600px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', padding: '30px 40px', borderRadius: '12px 12px 0 0', textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔐</div>
                      <h1 style={{ margin: 0, color: '#ffffff', fontSize: '24px', fontWeight: 700 }}>Reset Your Password</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ backgroundColor: '#18181b', padding: '40px', borderRadius: '0 0 12px 12px' }}>
                      <p style={{ margin: '0 0 30px', color: '#e4e4e7', fontSize: '16px', lineHeight: 1.6, textAlign: 'center' }}>Use the 4-digit code below to reset your password:</p>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '30px' }}>
                        {code.split('').map((digit, i) => (
                          <div key={i} style={{ width: '60px', height: '70px', backgroundColor: '#27272a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, color: '#ffffff', border: '2px solid #3f3f46' }}>{digit}</div>
                        ))}
                      </div>
                      <p style={{ margin: 0, color: '#f59e0b', fontSize: '14px', textAlign: 'center' }}>⏰ This code expires in 15 minutes</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Store Deactivation Template
function StoreDeactivationTemplate({ storeName, ownerName, reason }: { storeName: string; ownerName: string; reason?: string }) {
  return (
    <div style={{ margin: 0, padding: 0, backgroundColor: '#0a0a0a', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td align="center" style={{ padding: '40px 20px' }}>
              <table style={{ width: '100%', maxWidth: '600px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', padding: '30px 40px', borderRadius: '12px 12px 0 0' }}>
                      <h1 style={{ margin: 0, color: '#ffffff', fontSize: '24px', fontWeight: 700 }}>Store Deactivation Notice</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ backgroundColor: '#18181b', padding: '40px', borderRadius: '0 0 12px 12px' }}>
                      <p style={{ margin: '0 0 20px', color: '#e4e4e7', fontSize: '16px', lineHeight: 1.6 }}>Hello {ownerName},</p>
                      <p style={{ margin: '0 0 20px', color: '#e4e4e7', fontSize: '16px', lineHeight: 1.6 }}>We're writing to inform you that your store <strong style={{ color: '#a855f7' }}>{storeName}</strong> has been temporarily deactivated by our admin team.</p>
                      {reason && (
                        <div style={{ backgroundColor: '#27272a', borderLeft: '4px solid #a855f7', padding: '16px 20px', margin: '20px 0', borderRadius: '0 8px 8px 0' }}>
                          <p style={{ margin: '0 0 8px', color: '#a1a1aa', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reason</p>
                          <p style={{ margin: 0, color: '#e4e4e7', fontSize: '14px', lineHeight: 1.5 }}>{reason}</p>
                        </div>
                      )}
                      <ul style={{ margin: '20px 0', paddingLeft: '20px', color: '#a1a1aa', fontSize: '14px', lineHeight: 1.8 }}>
                        <li>Your products will not be visible to customers</li>
                        <li>Customers cannot make purchases from your store</li>
                        <li>Your existing orders and earnings are preserved</li>
                        <li>You can still access your seller dashboard</li>
                      </ul>
                      <div style={{ textAlign: 'center', marginTop: '30px' }}>
                        <a href="#" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', color: '#ffffff', textDecoration: 'none', padding: '14px 32px', borderRadius: '8px', fontWeight: 600, fontSize: '14px' }}>Contact Support</a>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Store Reactivation Template
function StoreReactivationTemplate({ storeName, ownerName }: { storeName: string; ownerName: string }) {
  return (
    <div style={{ margin: 0, padding: 0, backgroundColor: '#f4f4f5', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td align="center" style={{ padding: '40px 20px' }}>
              <table style={{ maxWidth: '600px', width: '100%', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '40px 40px 20px 40px', textAlign: 'center' }}>
                      <div style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '28px', color: 'white' }}>✓</span>
                      </div>
                      <h1 style={{ margin: '0 0 10px 0', fontSize: '24px', color: '#18181b', fontWeight: 600 }}>Your Store Has Been Reactivated</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0 40px 30px 40px' }}>
                      <p style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#3f3f46', lineHeight: 1.6 }}>Hi {ownerName},</p>
                      <p style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#3f3f46', lineHeight: 1.6 }}>Great news! Your store <strong style={{ color: '#18181b' }}>{storeName}</strong> has been reactivated and is now live on our marketplace.</p>
                      <p style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#3f3f46', lineHeight: 1.6 }}>Your products are now visible to customers and you can resume selling immediately.</p>
                      <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '15px', margin: '20px 0' }}>
                        <p style={{ margin: 0, fontSize: '14px', color: '#166534' }}><strong>What's next?</strong><br />Check your store dashboard to ensure all your products and settings are up to date.</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Application Confirmation Template
function ApplicationConfirmationTemplate({ applicantName, position }: { applicantName: string; position: string }) {
  return (
    <div style={{ margin: 0, padding: 0, backgroundColor: '#0a0a0a', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td align="center" style={{ padding: '40px 20px' }}>
              <table style={{ width: '100%', maxWidth: '600px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', padding: '30px 40px', borderRadius: '12px 12px 0 0', textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '10px' }}>📝</div>
                      <h1 style={{ margin: 0, color: '#ffffff', fontSize: '24px', fontWeight: 700 }}>Application Received</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ backgroundColor: '#18181b', padding: '40px', borderRadius: '0 0 12px 12px' }}>
                      <p style={{ margin: '0 0 20px', color: '#e4e4e7', fontSize: '16px', lineHeight: 1.6 }}>Hello {applicantName},</p>
                      <p style={{ margin: '0 0 20px', color: '#e4e4e7', fontSize: '16px', lineHeight: 1.6 }}>Thank you for applying for the <strong style={{ color: '#a855f7' }}>{position}</strong> position at Eclipse!</p>
                      <p style={{ margin: '0 0 20px', color: '#e4e4e7', fontSize: '16px', lineHeight: 1.6 }}>We have received your application and our team will review it carefully. We'll be in touch within 3-5 business days with an update.</p>
                      <div style={{ backgroundColor: '#27272a', borderRadius: '8px', padding: '20px', marginTop: '20px' }}>
                        <p style={{ margin: 0, color: '#a1a1aa', fontSize: '14px', textAlign: 'center' }}>💜 Thank you for your interest in joining our team!</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Bot Status Template
function BotStatusTemplate({ productName, installationCode, status, discordGuildName }: { productName: string; installationCode: string; status: string; discordGuildName?: string }) {
  const getStatusContent = () => {
    switch (status) {
      case 'verified':
        return { icon: '✅', title: 'Code Verified', color: '#22c55e', message: 'Your installation code has been verified. Our team will begin the installation shortly.' };
      case 'installing':
        return { icon: '⚙️', title: 'Installation In Progress', color: '#f59e0b', message: 'Our team is currently installing your bot. This usually takes 15-30 minutes.' };
      case 'completed':
        return { icon: '🎉', title: 'Installation Complete', color: '#22c55e', message: 'Your bot has been successfully installed and is now active!' };
      default:
        return { icon: '📦', title: 'Status Update', color: '#a855f7', message: 'Here\'s an update on your bot installation.' };
    }
  };

  const content = getStatusContent();

  return (
    <div style={{ margin: 0, padding: 0, backgroundColor: '#0a0a0a', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td align="center" style={{ padding: '40px 20px' }}>
              <table style={{ width: '100%', maxWidth: '600px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ background: `linear-gradient(135deg, ${content.color} 0%, ${content.color}99 100%)`, padding: '30px 40px', borderRadius: '12px 12px 0 0', textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '10px' }}>{content.icon}</div>
                      <h1 style={{ margin: 0, color: '#ffffff', fontSize: '24px', fontWeight: 700 }}>{content.title}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ backgroundColor: '#18181b', padding: '40px', borderRadius: '0 0 12px 12px' }}>
                      <p style={{ margin: '0 0 20px', color: '#e4e4e7', fontSize: '16px', lineHeight: 1.6 }}>{content.message}</p>
                      <div style={{ backgroundColor: '#27272a', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
                        <p style={{ margin: '0 0 8px', color: '#a1a1aa', fontSize: '12px', textTransform: 'uppercase' }}>Product</p>
                        <p style={{ margin: '0 0 16px', color: '#ffffff', fontSize: '16px', fontWeight: 600 }}>{productName}</p>
                        <p style={{ margin: '0 0 8px', color: '#a1a1aa', fontSize: '12px', textTransform: 'uppercase' }}>Installation Code</p>
                        <p style={{ margin: 0, color: '#a855f7', fontSize: '18px', fontWeight: 700, fontFamily: 'monospace' }}>{installationCode}</p>
                        {discordGuildName && (
                          <>
                            <p style={{ margin: '16px 0 8px', color: '#a1a1aa', fontSize: '12px', textTransform: 'uppercase' }}>Discord Server</p>
                            <p style={{ margin: 0, color: '#ffffff', fontSize: '16px' }}>{discordGuildName}</p>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const templates = [
  { id: 'otp', label: 'OTP / Verification', icon: Key },
  { id: 'password-reset', label: 'Password Reset', icon: ShieldCheck },
  { id: 'store-deactivation', label: 'Store Deactivation', icon: Store },
  { id: 'store-reactivation', label: 'Store Reactivation', icon: Store },
  { id: 'application', label: 'Application Confirmation', icon: UserCheck },
  { id: 'bot-status', label: 'Bot Status Update', icon: Bot },
];

export default function EmailTemplates() {
  const [activeTab, setActiveTab] = useState('otp');

  const renderTemplate = () => {
    switch (activeTab) {
      case 'otp':
        return <OtpEmailTemplate token={sampleData.otp.token} actionType={sampleData.otp.email_action_type} />;
      case 'password-reset':
        return <PasswordResetTemplate code={sampleData.passwordReset.code} />;
      case 'store-deactivation':
        return <StoreDeactivationTemplate {...sampleData.storeDeactivation} />;
      case 'store-reactivation':
        return <StoreReactivationTemplate {...sampleData.storeReactivation} />;
      case 'application':
        return <ApplicationConfirmationTemplate {...sampleData.applicationConfirmation} />;
      case 'bot-status':
        return <BotStatusTemplate {...sampleData.botStatus} />;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Email Templates
          </h1>
          <p className="text-muted-foreground">Preview all email templates with sample data</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Mobile dropdown */}
          <div className="sm:hidden mb-4">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      <template.icon className="h-4 w-4" />
                      {template.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop tabs */}
          <TabsList className="hidden sm:flex flex-wrap h-auto gap-1">
            {templates.map((template) => (
              <TabsTrigger key={template.id} value={template.id} className="flex items-center gap-1.5">
                <template.icon className="h-4 w-4" />
                {template.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {templates.find(t => t.id === activeTab)?.label} Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] w-full rounded-lg border">
                <div className="min-w-[320px]">
                  {renderTemplate()}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
