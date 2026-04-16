import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { StripeCheckoutForm } from './StripeCheckoutForm';

// In a real app, this key should be an environment variable.
const stripePromise = loadStripe('pk_test_51BTUDGJAJfZb9HEBwDgY2pzkFWHRinW2t8XvOvnUrvJOhJIqU9aTDKRmGDEnGNQA7DB02bF8I2Eim4jd44y7YN9d00f5OKwS27');

interface StripePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StripePaymentModal: React.FC<StripePaymentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Update Payment Method</ModalTitle>
          <ModalDescription>
            Enter your card details below. Your payment information is securely handled by Stripe.
          </ModalDescription>
        </ModalHeader>
        <div className="p-6">
          <Elements stripe={stripePromise}>
            <StripeCheckoutForm onSuccess={() => {
              onSuccess();
              onClose();
            }} />
          </Elements>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
