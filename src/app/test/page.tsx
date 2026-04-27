export default function TestPage() {
    return (
        <div style={{ padding: '50px', textAlign: 'center', background: '#000', color: '#fff', height: '100vh' }}>
            <h1>Build Sync Test</h1>
            <p>If you can see this, the build is synced. Current time: {new Date().toISOString()}</p>
        </div>
    );
}
