/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#13daec',
                'primary-dark': '#0ebac9',
                'background-light': '#f6f8f8',
                'background-dark': '#102022',
                'ai-glow': '#0ea5e9',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            borderRadius: {
                DEFAULT: '0.25rem',
                lg: '0.5rem',
                xl: '0.75rem',
                '2xl': '1rem',
            },
        },
    },
    plugins: [],
}
