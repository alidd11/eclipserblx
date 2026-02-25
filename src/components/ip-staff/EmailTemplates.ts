export interface EmailTemplate {
  id: string;
  name: string;
  type: 'general' | 'dmca_takedown' | 'abuse_complaint';
  subject: string;
  body: string;
}

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'dmca_initial',
    name: 'DMCA Takedown Notice',
    type: 'dmca_takedown',
    subject: 'DMCA Takedown Notice — Unauthorized Use of Copyrighted Material',
    body: `Dear Sir/Madam,

I am writing to you on behalf of our client pursuant to the Digital Millennium Copyright Act (17 U.S.C. § 512) to notify you of infringing material hosted on your platform.

IDENTIFICATION OF COPYRIGHTED WORK:
[Describe the original copyrighted work, including title, registration number if applicable, and URLs where the original can be found]

IDENTIFICATION OF INFRINGING MATERIAL:
[Provide URLs or specific locations of the infringing content]

GOOD FAITH STATEMENT:
I have a good faith belief that the use of the copyrighted material described above is not authorized by the copyright owner, its agent, or the law.

ACCURACY STATEMENT:
The information in this notification is accurate, and under penalty of perjury, I am authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.

We request that you expeditiously remove or disable access to the infringing material identified above.

Please direct any correspondence regarding this matter to the undersigned.

Sincerely,
IP Shield Legal Team
Eclipser — legal@eclipserblx.com`,
  },
  {
    id: 'dmca_followup',
    name: 'DMCA Follow-Up / Non-Compliance',
    type: 'dmca_takedown',
    subject: 'Follow-Up: DMCA Takedown Notice — Immediate Action Required',
    body: `Dear Sir/Madam,

This letter serves as a follow-up to our previous DMCA takedown notice dated [DATE], regarding unauthorized use of copyrighted material hosted on your platform.

As of the date of this correspondence, the infringing material identified in our original notice remains accessible at:
[URLs of still-active infringing content]

We remind you that under 17 U.S.C. § 512, service providers must act expeditiously to remove or disable access to infringing material upon receipt of a valid takedown notice to maintain safe harbor protection.

We respectfully request immediate removal of the identified content. Failure to comply may result in further legal action to protect our client's intellectual property rights.

Sincerely,
IP Shield Legal Team
Eclipser — legal@eclipserblx.com`,
  },
  {
    id: 'abuse_hosting',
    name: 'Abuse Complaint — Hosting Provider',
    type: 'abuse_complaint',
    subject: 'Abuse Report: Intellectual Property Violation on Your Infrastructure',
    body: `Dear Abuse Team,

We are writing to report a violation of your Acceptable Use Policy involving content hosted on your infrastructure that infringes upon our client's intellectual property rights.

INFRINGING CONTENT DETAILS:
- URL(s): [Provide full URLs]
- IP Address: [If known]
- Nature of Infringement: [Describe how the content infringes — e.g., unauthorized redistribution, stolen assets, counterfeit products]

ORIGINAL WORK:
[Describe the original work and provide evidence of ownership]

We request that you investigate this matter and take appropriate action in accordance with your abuse policies, including but not limited to suspending or removing the offending content.

This report is made in good faith. We are available to provide any additional information or documentation you may require.

Thank you for your prompt attention to this matter.

Sincerely,
IP Shield Legal Team
Eclipser — legal@eclipserblx.com`,
  },
  {
    id: 'abuse_registrar',
    name: 'Abuse Complaint — Domain Registrar',
    type: 'abuse_complaint',
    subject: 'Domain Abuse Report: Intellectual Property Infringement',
    body: `Dear Registrar Abuse Team,

We are filing a formal abuse complaint regarding a domain registered through your services that is being used to host and distribute content that infringes upon our client's intellectual property rights.

OFFENDING DOMAIN: [domain.com]
REGISTRANT (if known): [Registrant name/organization from WHOIS]

NATURE OF ABUSE:
[Describe the infringing activity — e.g., unauthorized distribution of copyrighted Roblox assets, stolen digital products]

EVIDENCE:
[List URLs showing the infringing content and links to the original copyrighted works]

We request that you take action in accordance with your registrar abuse policies and ICANN regulations. Please acknowledge receipt of this complaint and inform us of any actions taken.

Sincerely,
IP Shield Legal Team
Eclipser — legal@eclipserblx.com`,
  },
  {
    id: 'general_inquiry',
    name: 'General Inquiry / Information Request',
    type: 'general',
    subject: 'Inquiry Regarding [Subject]',
    body: `Dear [Recipient Name],

I am writing on behalf of our client regarding [briefly describe the matter].

[Body of the inquiry — what information you need, what action you are requesting, any relevant context]

We would appreciate a response at your earliest convenience. Please do not hesitate to contact us if you require any additional information.

Thank you for your time and cooperation.

Sincerely,
IP Shield Legal Team
Eclipser — legal@eclipserblx.com`,
  },
  {
    id: 'general_cease_desist',
    name: 'Cease & Desist Letter',
    type: 'general',
    subject: 'Cease and Desist: Unauthorized Use of Intellectual Property',
    body: `Dear [Recipient Name],

We represent [Client Name] with respect to the unauthorized use of their intellectual property.

It has come to our attention that you are [describe the infringing activity] without the authorization, license, or consent of our client.

Our client's rights in the subject intellectual property are well established. [Briefly describe the nature of the IP — copyright, trademark, etc., and any registration details]

DEMAND:
We hereby demand that you immediately:
1. Cease and desist all use of the aforementioned intellectual property;
2. Remove all infringing content from any platforms, websites, or services under your control;
3. Confirm in writing within [14] days of receipt of this letter that you have complied with the above demands.

Failure to comply with this demand may result in our client pursuing all available legal remedies, including but not limited to seeking injunctive relief and damages.

This letter is written without prejudice to our client's rights and remedies, all of which are expressly reserved.

Sincerely,
IP Shield Legal Team
Eclipser — legal@eclipserblx.com`,
  },
];
