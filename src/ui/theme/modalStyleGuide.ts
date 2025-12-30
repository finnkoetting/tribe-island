// Style Guide für Modals im Tribez-Look
// Farben, Ecken, Schatten, Typografie, Buttons

export const MODAL_STYLE = {
  background: 'linear-gradient(135deg, #2e2a1c 0%, #4b4327 100%)', // warmes, leicht goldenes Braun
  borderRadius: 22,
  border: '3px solid #e2c17c', // goldener Rahmen
  boxShadow: '0 8px 32px rgba(60,40,10,0.25)',
  padding: 24,
  color: '#fffbe6',
  fontFamily: 'Quicksand, Nunito, Arial, sans-serif',
  headerFontWeight: 900,
  headerFontSize: 22,
  subHeaderFontSize: 15,
  button: {
    background: 'linear-gradient(90deg, #ffe082 0%, #ffd54f 100%)',
    color: '#4b4327',
    border: '2px solid #e2c17c',
    borderRadius: 14,
    fontWeight: 900,
    fontSize: 16,
    boxShadow: '0 2px 8px rgba(60,40,10,0.10)',
    padding: '12px 28px',
    hover: {
      background: 'linear-gradient(90deg, #fffde7 0%, #ffe082 100%)',
      color: '#3e3520',
    }
  },
  card: {
    background: 'rgba(255, 245, 200, 0.08)',
    border: '2px solid #e2c17c',
    borderRadius: 16,
    boxShadow: '0 2px 8px rgba(60,40,10,0.10)',
    padding: 16,
  }
};
