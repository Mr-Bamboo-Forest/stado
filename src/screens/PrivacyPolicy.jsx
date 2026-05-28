export default function PrivacyPolicy({ onBack }) {
  return (
    <div style={s.screen}>
      <header style={s.header}>
        <button style={s.backBtn} onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2C2C2A" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span style={s.headerTitle}>Privacy Policy</span>
        <div style={s.spacer} />
      </header>

      <div style={s.content}>
        <p style={s.updated}>Last updated: June 2025</p>

        <Section title="1. Who we are">
          Stado is a pickup football organiser app based in Australia. When we say "Stado", "we", "us" or "our" in this policy, we mean the team behind stado.app.
          {'\n\n'}
          This policy is governed by the Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).
          {'\n\n'}
          If you have any questions about this policy, contact us at{' '}
          <a href="mailto:stado.football@gmail.com" style={s.link}>stado.football@gmail.com</a>.
        </Section>

        <Section title="2. What data we collect">
          <strong style={s.strong}>Account data</strong>
          {'\n'}
          When you sign in with Google we receive your name, email address, and profile photo from your Google account. We store these in our database alongside a unique user code used to identify you to other players.
          {'\n\n'}
          <strong style={s.strong}>Profile data</strong>
          {'\n'}
          During onboarding you choose your preferred playing positions (goalkeeper, defender, midfielder, winger, or striker). This is stored on your profile and visible to other users.
          {'\n\n'}
          <strong style={s.strong}>Game activity</strong>
          {'\n'}
          When you post a game we store the game name, format, skill level, date and time, location name, and the precise latitude and longitude of the venue (used to show the location on a map to players who have joined). We also store whether the game is public or private, any optional notes you add, and the total spots available.
          {'\n\n'}
          When you join a game your name, profile photo, and current no-show rate are stored alongside the game record so other players and the host can see who is attending.
          {'\n\n'}
          <strong style={s.strong}>Attendance data</strong>
          {'\n'}
          After a game the host can mark attendance. We record the number of games you have attended and the number of times you did not show up. From these we calculate a no-show rate that is visible to other users on your public profile.
          {'\n\n'}
          <strong style={s.strong}>Friends</strong>
          {'\n'}
          If you add another user as a friend, both users' accounts are updated to store each other's user ID.
          {'\n\n'}
          <strong style={s.strong}>Payment data</strong>
          {'\n'}
          If you upgrade to a paid membership, payment is processed entirely by Stripe. We never see or store your card details. We only store a Stripe customer ID and your membership status and expiry date.
          {'\n\n'}
          <strong style={s.strong}>Guest browsing</strong>
          {'\n'}
          You can browse the app as a guest using anonymous sign-in. In this mode we do not collect any personal information. No profile is created and no data is stored against you.
        </Section>

        <Section title="3. How we use your data">
          We use your data solely to operate the app: displaying your profile to other signed-in users, matching you with nearby games, recording your attendance history, and processing membership payments. We do not sell your data to third parties and we do not use it for advertising purposes.
        </Section>

        <Section title="4. Who can see your information">
          Other signed-in users can see your display name, profile photo, preferred positions, games attended count, and no-show rate on your public profile. Your email address is never shown to other users.
          {'\n\n'}
          The precise location (latitude and longitude) of a game is only revealed to players who have joined that game. Users who have not joined only see the general area.
        </Section>

        <Section title="5. Third-party services">
          <strong style={s.strong}>Firebase (Google)</strong> — we use Firebase Firestore to store all app data and Firebase Authentication to handle sign-in. Google's privacy policy applies to data processed by Firebase.
          {'\n\n'}
          <strong style={s.strong}>Stripe</strong> — we use Stripe to process membership payments. Your payment details are handled entirely by Stripe and are never transmitted to or stored by Stado. Stripe's privacy policy applies to payment data.
          {'\n\n'}
          We encourage you to review the privacy policies of both services.
        </Section>

        <Section title="6. Data retention">
          Your data is stored for as long as your account remains active. You can request deletion of your account and all associated data at any time by emailing{' '}
          <a href="mailto:stado.football@gmail.com" style={s.link}>stado.football@gmail.com</a>. We will action deletion requests within a reasonable time.
        </Section>

        <Section title="7. Access and correction">
          Under the Australian Privacy Act you have the right to request access to the personal information we hold about you, and to ask us to correct it if it is inaccurate. To make a request, contact us at{' '}
          <a href="mailto:stado.football@gmail.com" style={s.link}>stado.football@gmail.com</a>.
        </Section>

        <Section title="8. Changes to this policy">
          We may update this policy from time to time. We will notify users of significant changes within the app. Continued use of Stado after an updated policy is posted constitutes your acceptance of the changes.
        </Section>

        <div style={s.contact}>
          <p style={s.contactText}>Questions? Reach us at{' '}<a href="mailto:stado.football@gmail.com" style={s.link}>stado.football@gmail.com</a></p>
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
  strong: { fontWeight: '600', color: '#2C2C2A' },
  link: { color: '#1D9E75', fontWeight: '500' },
  contact: { background: 'white', borderRadius: '14px', padding: '16px 18px', border: '1px solid #E0DDD5', textAlign: 'center' },
  contactText: { fontSize: '14px', color: '#7A7A72', margin: 0 },
}