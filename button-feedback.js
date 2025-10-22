// Enhanced Button Feedback System
class ButtonFeedback {
    constructor() {
        this.init();
    }

    init() {
        // Add click feedback to all buttons
        document.addEventListener('click', (e) => {
            const button = e.target.closest('.btn, .action-btn, .tool-btn, .tab-btn, .theme-toggle, .modal-close, .close-btn');
            if (button) {
                this.createRippleEffect(button, e);
            }
        });

        // Add loading state functionality
        this.setupLoadingStates();
        
        // Add success/error feedback functionality
        this.setupFeedbackStates();
    }

    createRippleEffect(button, event) {
        // Remove existing ripple
        const existingRipple = button.querySelector('.ripple-effect');
        if (existingRipple) {
            existingRipple.remove();
        }

        // Create new ripple
        const ripple = document.createElement('span');
        ripple.classList.add('ripple-effect');
        
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.6);
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
            z-index: 1;
        `;
        
        button.appendChild(ripple);
        
        // Remove ripple after animation
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.remove();
            }
        }, 600);
    }

    setupLoadingStates() {
        // Add loading state to form submissions
        document.addEventListener('submit', (e) => {
            const submitButton = e.target.querySelector('button[type="submit"], .btn-primary');
            if (submitButton) {
                this.setLoadingState(submitButton, true);
                
                // Remove loading state after 2 seconds (or when form processing is done)
                setTimeout(() => {
                    this.setLoadingState(submitButton, false);
                }, 2000);
            }
        });
    }

    setupFeedbackStates() {
        // Listen for custom events to trigger feedback
        document.addEventListener('button-success', (e) => {
            this.showSuccessFeedback(e.detail.button);
        });

        document.addEventListener('button-error', (e) => {
            this.showErrorFeedback(e.detail.button);
        });
    }

    setLoadingState(button, isLoading) {
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
            button.setAttribute('data-original-text', button.textContent);
        } else {
            button.classList.remove('loading');
            button.disabled = false;
            const originalText = button.getAttribute('data-original-text');
            if (originalText) {
                button.textContent = originalText;
                button.removeAttribute('data-original-text');
            }
        }
    }

    showSuccessFeedback(button) {
        button.classList.add('success-feedback');
        setTimeout(() => {
            button.classList.remove('success-feedback');
        }, 600);
    }

    showErrorFeedback(button) {
        button.classList.add('error-feedback');
        setTimeout(() => {
            button.classList.remove('error-feedback');
        }, 500);
    }

    // Public methods for manual feedback triggering
    static triggerSuccess(buttonSelector) {
        const button = document.querySelector(buttonSelector);
        if (button) {
            document.dispatchEvent(new CustomEvent('button-success', {
                detail: { button }
            }));
        }
    }

    static triggerError(buttonSelector) {
        const button = document.querySelector(buttonSelector);
        if (button) {
            document.dispatchEvent(new CustomEvent('button-error', {
                detail: { button }
            }));
        }
    }

    static setLoading(buttonSelector, isLoading = true) {
        const button = document.querySelector(buttonSelector);
        if (button) {
            const feedback = new ButtonFeedback();
            feedback.setLoadingState(button, isLoading);
        }
    }
}

// Initialize the button feedback system
document.addEventListener('DOMContentLoaded', () => {
    new ButtonFeedback();
});

// Export for use in other scripts
window.ButtonFeedback = ButtonFeedback;