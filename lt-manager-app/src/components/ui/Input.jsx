import React from 'react';
import styles from './Input.module.css';

export default function Input({ label, error, className = '', ...props }) {
  const inputId = props.id || props.name;
  
  return (
    <div className={`${styles.wrapper} ${className}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <input 
        id={inputId}
        className={`${styles.input} ${error ? styles.inputError : ''}`} 
        {...props} 
      />
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
}
