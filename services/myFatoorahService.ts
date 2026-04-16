/**
 * @license
 * Copyright 2025 Flowtiva LLC
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// Configuration for MyFatoorah API
const API_BASE_URL = 'https://apitest.myfatoorah.com/v3';
const API_TOKEN = 'SK_KWT_vVZlnnAqu8jRByOWaRPNId4ShzEDNt256dvnjebuyzo52dXjAfRx2ixW5umjWSUx';

export interface InitiatePaymentResponse {
  IsSuccess: boolean;
  Message: string;
  Data: {
    PaymentURL: string;
    InvoiceId: number;
  };
}

export interface PaymentDetailsResponse {
    IsSuccess: boolean;
    Message: string;
    Data: {
        InvoiceId: number;
        InvoiceStatus: string;
        InvoiceValue: number;
        CustomerName: string;
        PaymentMethod: string;
        CreatedDate: string;
        ExpiryDate: string;
        InvoiceDisplayValue: string;
        Transactions: any[];
    };
    ValidationErrors?: any[];
}

export const initiatePayment = async (
  amount: number,
  currency: string = 'QAR',
  customerName: string = 'Guest',
  customerEmail: string = 'guest@example.com'
): Promise<InitiatePaymentResponse> => {
  const response = await fetch(`${API_BASE_URL}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`
    },
    body: JSON.stringify({
      PaymentMethod: 'INVOICE', // Creates a payment page with all methods
      Order: {
        Amount: amount,
        Currency: currency
      },
      Customer: {
        Name: customerName,
        Email: customerEmail
      },
      IntegrationUrls: {
        Success: window.location.href.split('?')[0] + '?payment_status=success',
        Error: window.location.href.split('?')[0] + '?payment_status=failed'
      },
      Language: 'EN'
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.Message || 'Failed to initiate payment');
  }

  return await response.json();
};

export const getPaymentDetails = async (paymentId: string): Promise<PaymentDetailsResponse> => {
    const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.Message || 'Failed to retrieve payment details');
    }

    return await response.json();
};