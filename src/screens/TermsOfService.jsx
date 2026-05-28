export default function TermsOfService({ onBack }) {
  return (
    <div style={s.screen}>
      <header style={s.header}>
        <button style={s.backBtn} onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2C2C2A" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span style={s.headerTitle}>Terms of Service</span>
        <div style={s.spacer} />
      </header>

      <div style={s.content}>
        <p style={s.updated}>Last updated: June 2025</p>

        <Section title="1. Acceptance of terms">
          By creating an account or using Stado you agree to these Terms of Service. If you do not agree, please do not use the app. We may update these terms from time to time — continued use after changes are posted means you accept the updated terms.
        </Section>

        <Section title="2. Eligibility">
          You must be at least 16 years old to use Stado. By using the app you confirm that you meet this requirement.
        </Section>

        <Section title="3. Your account">
          You are responsible for keeping your account credentials secure and for all activity that occurs under your account. Please notify us immediately at{' '}
          <a href="mailto:stado.football@gmail.com" style={s.link}>stado.football@gmail.com</a> if you suspect unauthorised access.
        </Section>

        <Section title="4. Acceptable use">
          You agree not to use Stado to post false or misleading game information, harass or abuse other users, impersonate any person or organisation, or attempt to access or tamper with another user's data. We reserve the right to suspend or terminate accounts that violate these rules.
        </Section>

        <Section title="5. Games and attendance">
          Hosts are responsible for the accuracy of the game information they post. Players who commit to joining a game are expected to attend or cancel in advance. Repeated no-shows may result in a higher no-show rate visible to other users, or account suspension at our discretion.
        </Section>

        <Section title="6. Memberships and payments">
          Paid memberships are processed by Stripe. Prices and features are shown on the membership page in the app. Memberships are non-refundable except where required by applicable law. We reserve the right to change membership pricing with reasonable notice.
        </Section>

        <Section title="7. Disclaimer of warranties">
          Stado is provided "as is" without warranties of any kind. We do not guarantee the accuracy of game listings or the behaviour of other users. We are not responsible for any harm arising from in-person games arranged through the platform.
        </Section>

        <Section title="8. Limitation of liability">
          To the fullest extent permitted by law, Stado and its team shall not be liable for any indirect, incidental, or consequential damages arising from your use of the app.
        </Section>

        <Section title="9. Governing law">
          These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.
        </Section>

        <Section title="10. Contact">
          For any questions about these terms, please contact us at{' '}
          <a href="mailto:stado.football@gmail.com" style={s.link}>stado.football@gmail.com</a>.
        </Section>

        <div style={s.contact}>
          <p style={s.contactText}>Questions? Reach us at <a href="mailto:stado.football@gmail.com" style={s.link}>stado.football@gmail.com</a></p>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={s.section}>
      <p style={s.sectionTitle}>{title}</p>
      <p style={s.body}>{children}</p>
    </div>
  )
}

const s = {
  screen: { flex: 1, display: 'flex', flexDirection: 'column', background: '#F1EFE8', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'white', borderBottom: '1px solid #E0DDD5', flexShrink: 0 },
  backBtn: { width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '12px' },
  headerTitle: { fontSize: '16px', fontWeight: '600', color: '#2C2C2A' },
  spacer: { width: '40px' },
  content: { flex: 1, overflowY: 'auto', padding: '20px 16px 48px', display: 'flex', flexDirection: 'column', gap: '12px' },
  updated: { fontSize: '12px', color: '#7A7A72', margin: 0 },
  section: { background: 'white', borderRadius: '14px', padding: '16px 18px', border: '1px solid #E0DDD5' },
  sectionTitle: { fontSize: '14px', fontWeight: '700', color: '#085041', margin: '0 0 8px' },
  body: { fontSize: '14px', color: '#555550', lineHeight: '1.65', margin: 0, whiteSpace: 'pre-line' },
  link: { color: '#1D9E75', fontWeight: '500' },
  contact: { background: 'white', borderRadius: '14px', padding: '16px 18px', border: '1px solid #E0DDD5', textAlign: 'center' },
  contactText: { fontSize: '14px', color: '#7A7A72', margin: 0 },
}