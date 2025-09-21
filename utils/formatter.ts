
export interface SentimentStyle {
    icon: '▲' | '▼' | '●' | '❓';
    bgColor: string;
    textColor: string;
    label: string;
}

export function formatTextToHtml(text: string): string {
    if (!text) return '';

    // 1. Escape basic HTML tags to prevent XSS
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    // 2. Convert Markdown-like syntax to HTML tags
    // Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic: _text_
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // 3. Convert bullet points (•) into proper list items for better semantics and styling
    html = html.replace(/• /g, '&bull; ');

    // 4. Convert newlines to <br> tags for paragraphs
    html = html.replace(/\n/g, '<br />');

    return html;
}

export function formatSentimentScore(score: number | null | undefined): string {
    if (score === null || score === undefined) return '?';
    if (score > 0) return `+${score}`;
    return String(score);
}

export function getSentimentStyles(score: number | null | undefined): SentimentStyle {
    const label = formatSentimentScore(score);

    if (score === null || score === undefined) {
        return { icon: '❓', bgColor: '#e2e8f0', textColor: '#475569', label };
    }
    if (score > 3) { // Strong Positive
        return { icon: '▲', bgColor: '#dcfce7', textColor: '#166534', label };
    }
    if (score > 0) { // Positive
        return { icon: '▲', bgColor: '#f0fdf4', textColor: '#059669', label };
    }
    if (score < -3) { // Strong Negative
        return { icon: '▼', bgColor: '#fee2e2', textColor: '#991b1b', label };
    }
    if (score < 0) { // Negative
        return { icon: '▼', bgColor: '#fff1f2', textColor: '#be123c', label };
    }
    // Neutral
    return { icon: '●', bgColor: '#f1f5f9', textColor: '#475569', label };
}
