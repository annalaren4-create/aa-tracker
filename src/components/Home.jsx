export default function Home({ setView, studentCount }) {
  return (
    <div>
      <div className="header">
        <div>
          <span className="logo-badge">Aviation Adventures</span>
          <h1 style={{ marginTop: 4 }}>Student Progress Tracker</h1>
        </div>
        <small>KHEF · KRMN · KHWY · KOKV · KJYO</small>
      </div>

      <div style={{ padding: '40px 20px', maxWidth: 520, margin: '0 auto' }}>
        <p style={{ color: '#6b7280', marginBottom: 24, textAlign: 'center', fontSize: 14 }}>
          Select your role to continue
        </p>

        <div className="grid2" style={{ gap: 20 }}>
          <div
            className="home-card"
            onClick={() => setView('instructor-login')}
          >
            <span className="icon">🧑‍✈️</span>
            <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Instructor portal</h2>
            <p style={{ fontSize: 13, color: '#6b7280' }}>
              Manage all {studentCount} students, log flights, track budgets
            </p>
          </div>

          <div
            className="home-card"
            onClick={() => setView('student-login')}
          >
            <span className="icon">📋</span>
            <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Student portal</h2>
            <p style={{ fontSize: 13, color: '#6b7280' }}>
              View your personal course progress and syllabus
            </p>
          </div>
        </div>

        <div className="info-box" style={{ marginTop: 24 }}>
          ✈️&nbsp; Aircraft rates effective 4/1/2026 · Part 141 · Liberty University, Purdue Global,
          California Aeronautics University
        </div>
      </div>
    </div>
  )
}
