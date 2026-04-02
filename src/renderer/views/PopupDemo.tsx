import React from 'react';

const PopupDemo: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Popup Demo</h2>
      <p style={{ color: '#718096', marginTop: '8px' }}>
        Esta view demonstrará o popup de vinculação de projeto.
      </p>
      <div style={{ marginTop: '20px', padding: '16px', background: '#161C26', borderRadius: '10px' }}>
        <p style={{ fontSize: '13px', color: '#A0AEC0' }}>
          O popup aparecerá quando um aplicativo monitorado for detectado após o tempo mínimo configurado (padrão: 2 minutos).
        </p>
      </div>
    </div>
  );
};

export default PopupDemo;
