
import React from 'react';
import { getSentimentStyles } from '../utils/formatter';

interface SentimentBadgeProps {
    score: number | null | undefined;
}

export const SentimentBadge: React.FC<SentimentBadgeProps> = ({ score }) => {
    if (score === null || score === undefined) {
        return null; 
    }

    const styles = getSentimentStyles(score);

    return (
        <div
            className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-colors"
            style={{ backgroundColor: styles.bgColor, color: styles.textColor }}
            title={`Sentimiento: ${styles.label}`}
        >
            <span style={{ fontSize: '0.9em' }}>{styles.icon}</span>
            <span>{styles.label}</span>
        </div>
    );
};
