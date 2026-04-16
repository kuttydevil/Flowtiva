import React, { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { Button } from '../ui/Button';
import { useToast } from '../../contexts/ToastContext';

// Style for the CardElement to match the app's theme
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: 'hsl(var(--foreground))',
      fontFamily: 'Inter, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: 'hsl(var(--muted-foreground))',
      },
    },
    invalid: {
      color: 'hsl(var(--destructive))',
      iconColor: 'hsl(var(--destructive))',
    },
  },
};

export const StripeCheckoutForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!stripe || !elements) {
      setError("Stripe.js has not yet loaded. Please wait a moment and try again.");
      setIsLoading(false);
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Card element not found. Please refresh the page.");
      setIsLoading(false);
      return;
    }
    
    addToast("Updating payment method...", { type: 'info' });

    // --- SIMULATION ---
    // In a real application, you would create a SetupIntent on your backend and
    // use stripe.confirmCardSetup with the clientSecret.
    // For this demo, we'll just simulate a successful update.
    setTimeout(() => {
        setIsLoading(false);
        addToast("Payment method updated successfully!", { type: 'success' });
        onSuccess();
    }, 2500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 bg-brand-secondary rounded-md border border-brand-border">
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>
      {error && <div className="text-sm text-status-red">{error}</div>}
      <Button type="submit" disabled={!stripe || isLoading} className="w-full">
        {isLoading ? 'Processing...' : 'Save Card'}
      </Button>
    </form>
  );
};
