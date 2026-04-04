import React from 'react';
import { useI18n } from '../i18nContext';

const Management: React.FC = () => {
  const { t } = useI18n();

  return (
    <div style={{ padding: '20px' }}>
      <h2>{t('management.title')}</h2>
      <p style={{ color: '#718096', marginTop: '8px' }}>
        {t('management.description')}
      </p>
      <div style={{ marginTop: '20px', padding: '12px 16px', background: '#2A1A0A', border: '1px solid #C05621', borderRadius: '10px', color: '#F6AD55', fontSize: '13px' }}>
        {t('management.warning')}
      </div>
    </div>
  );
};

export default Management;
