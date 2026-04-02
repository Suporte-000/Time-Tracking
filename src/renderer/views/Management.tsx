import React from 'react';

const Management: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Gestão da Equipe</h2>
      <p style={{ color: '#718096', marginTop: '8px' }}>
        Acesso exclusivo para gestores - Visualize dados de toda a equipe.
      </p>
      <div style={{ marginTop: '20px', padding: '12px 16px', background: '#2A1A0A', border: '1px solid #C05621', borderRadius: '10px', color: '#F6AD55', fontSize: '13px' }}>
        ⚠️ Esta funcionalidade requer permissões de gestor
      </div>
    </div>
  );
};

export default Management;
