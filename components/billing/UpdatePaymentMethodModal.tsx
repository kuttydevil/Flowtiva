import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { PaymentMethod } from '../../types';

declare global {
  interface Window {
    google: any;
  }
}

interface UpdatePaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentPaymentMethod: PaymentMethod | null;
}

// Base Google Pay API configuration
const baseRequest = {
  apiVersion: 2,
  apiVersionMinor: 0
};

const allowedCardNetworks = ["AMEX", "DISCOVER", "JCB", "MASTERCARD", "VISA"];
const allowedCardAuthMethods = ["PAN_ONLY", "CRYPTOGRAM_3DS"];

const tokenizationSpecification = {
  type: 'PAYMENT_GATEWAY',
  parameters: {
    'gateway': 'example',
    'gatewayMerchantId': 'exampleGatewayMerchantId'
  }
};

const baseCardPaymentMethod = {
  type: 'CARD',
  parameters: {
    allowedAuthMethods: allowedCardAuthMethods,
    allowedCardNetworks: allowedCardNetworks
  }
};

const merchantInfo = {
  merchantId: '12345678901234567890',
  merchantName: 'Flowtiva'
};

export const UpdatePaymentMethodModal: React.FC<UpdatePaymentMethodModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { addToast } = useToast();
    const googlePayClientRef = useRef<any | null>(null);
    const googlePayButtonRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && window.google?.payments?.api && !googlePayClientRef.current) {
            try {
                googlePayClientRef.current = new window.google.payments.api.PaymentsClient({ environment: 'TEST' });
            } catch (err) {
                console.error("Error initializing Google Pay client:", err);
                addToast("Could not initialize Google Pay.", { type: 'error' });
            }
        }
    }, [isOpen, addToast]);

    useEffect(() => {
        if (!isOpen || !googlePayClientRef.current || !googlePayButtonRef.current) {
            return;
        }

        const client = googlePayClientRef.current;
        const buttonContainer = googlePayButtonRef.current;
        
        buttonContainer.innerHTML = '<p class="text-sm text-brand-text-secondary">Loading Google Pay...</p>';


        const onGooglePayClicked = () => {
            const paymentDataRequest: any = { ...baseRequest };
            paymentDataRequest.allowedPaymentMethods = [baseCardPaymentMethod];
            paymentDataRequest.transactionInfo = {
                totalPriceStatus: 'FINAL',
                totalPrice: '0.00', // Verification amount
                currencyCode: 'QAR',
                countryCode: 'QA'
            };
            paymentDataRequest.merchantInfo = merchantInfo;
            paymentDataRequest.tokenizationSpecification = tokenizationSpecification;

            client.loadPaymentData(paymentDataRequest)
                .then(function(paymentData: any) {
                    console.log("Received Google Pay token (simulation):", paymentData);
                    addToast("Payment method updated successfully!", { type: 'success' });
                    onSuccess();
                })
                .catch(function(err: any) {
                    console.error("Error loading Google Pay sheet: ", err);
                    if (err.statusCode !== 'CANCELED') {
                        addToast("An error occurred with Google Pay. Please check your details and try again.", { type: 'error' });
                    }
                });
        };

        const isReadyToPayRequest = { ...baseRequest, allowedPaymentMethods: [baseCardPaymentMethod] };
        client.isReadyToPay(isReadyToPayRequest)
            .then(function(response: { result: boolean }) {
                if (response.result && buttonContainer) {
                    buttonContainer.innerHTML = '';
                    const button = client.createButton({
                        onClick: onGooglePayClicked,
                        buttonType: 'long',
                        buttonColor: 'default',
                    });
                    buttonContainer.appendChild(button);
                } else if (buttonContainer) {
                    buttonContainer.innerHTML = '<p class="text-sm text-brand-text-secondary">Google Pay is not available on this device/browser.</p>';
                }
            })
            .catch(function(err: any) {
                console.error("Error checking Google Pay readiness: ", err);
                if (buttonContainer) {
                    buttonContainer.innerHTML = '<p class="text-sm text-status-red">Could not check for Google Pay.</p>';
                }
            });
            
    }, [isOpen, addToast, onSuccess]);

    return (
        <Modal open={isOpen} onOpenChange={onClose}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>Update Payment Method</ModalTitle>
                    <ModalDescription>
                        Securely update your payment method using Google Pay. Your card details are never shared with us.
                    </ModalDescription>
                </ModalHeader>
                <div className="p-6 text-center min-h-[70px] flex items-center justify-center">
                    <div id="google-pay-button-container" ref={googlePayButtonRef}>
                        {/* The button or status messages will be rendered here by the useEffect */}
                    </div>
                </div>
                <ModalFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};