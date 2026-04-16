/**
 * @license
 * Copyright 2025 Flowtiva LLC
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { InvoiceDetails } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface InvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceDetails | null;
}

const LogoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-brand-accent">
        <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM6 8.83v6.34L11.03 12 6 8.83zm7 0v6.34L18.03 12 13 8.83z"/>
    </svg>
);

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({ isOpen, onClose, invoice }) => {
  const { addToast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !invoice) return null;

  const handleDownloadPdf = async () => {
    const input = document.getElementById('invoice-print-area');
    if (!input) {
      addToast("Could not find the invoice element to download.", { type: 'error' });
      return;
    }

    setIsDownloading(true);

    // Temporarily switch to light mode for accurate color capture by html2canvas
    const wasDark = document.documentElement.classList.contains('dark');
    if (wasDark) {
        document.documentElement.classList.remove('dark');
    }

    try {
        // Allow DOM to re-render in light mode before capturing
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(input, {
            scale: 2, // Higher scale for better quality
            useCORS: true,
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('p', 'pt', 'letter');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        
        const imgProps = pdf.getImageProperties(imgData);
        const ratio = pdfWidth / imgProps.width;
        const finalHeight = imgProps.height * ratio;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, finalHeight);
        pdf.save(`invoice-${invoice.id}.pdf`);

    } catch (error) {
        console.error("Error generating PDF:", error);
        addToast("An error occurred while generating the PDF.", { type: 'error' });
    } finally {
        // Restore dark mode if it was on
        if (wasDark) {
            document.documentElement.classList.add('dark');
        }
        setIsDownloading(false);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent className="max-w-3xl">
        <div id="invoice-print-area" className="print-area p-8 text-brand-text-primary bg-brand-primary">
          <header className="flex justify-between items-start pb-6 border-b border-brand-border">
            <div>
              <div className="flex items-center gap-2">
                <LogoIcon />
                <h1 className="text-2xl font-bold">Flowtiva</h1>
              </div>
              <p className="text-xs text-brand-text-secondary mt-2">Doha, Qatar</p>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold uppercase text-brand-text-secondary tracking-wider">Invoice</h2>
              <p className="text-sm mt-1"># {invoice.id}</p>
              <p className="text-sm text-brand-text-secondary">Date: {new Date(invoice.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-8 my-8">
            <div>
              <h3 className="text-xs font-semibold uppercase text-brand-text-secondary mb-2">Bill To</h3>
              <p className="font-semibold">{invoice.billTo.name}</p>
              <p className="text-sm text-brand-text-secondary">{invoice.billTo.email}</p>
              <p className="text-sm text-brand-text-secondary">{invoice.billTo.address}</p>
            </div>
             <div className="text-right">
                <h3 className="text-xs font-semibold uppercase text-brand-text-secondary mb-2">Status</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    invoice.status === 'Paid' ? 'bg-status-green/10 text-status-green' : 'bg-status-red/10 text-status-red'
                }`}>{invoice.status}</span>
            </div>
          </section>

          <section>
            <table className="w-full text-sm">
              <thead className="bg-brand-secondary">
                <tr>
                  <th className="p-3 text-left font-semibold">Description</th>
                  <th className="p-3 text-right font-semibold">Quantity</th>
                  <th className="p-3 text-right font-semibold">Unit Price</th>
                  <th className="p-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item, index) => (
                  <tr key={index} className="border-b border-brand-border">
                    <td className="p-3">{item.description}</td>
                    <td className="p-3 text-right">{item.quantity || 1}</td>
                    <td className="p-3 text-right">QAR {item.amount.toFixed(2)}</td>
                    <td className="p-3 text-right font-medium">QAR {(item.amount * (item.quantity || 1)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="flex justify-end mt-6">
            <div className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-brand-text-secondary">Subtotal</span>
                <span className="font-medium">QAR {invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-text-secondary">Tax (0%)</span>
                <span className="font-medium">QAR {invoice.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-brand-border pt-2 mt-2">
                <span>Total</span>
                <span>QAR {invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </section>

          <footer className="mt-12 text-center text-xs text-brand-text-secondary border-t border-brand-border pt-4">
            <p>Thank you for your business!</p>
            <p>Flowtiva | support@flowtiva.io</p>
          </footer>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleDownloadPdf} disabled={isDownloading}>
            {isDownloading ? 'Downloading...' : 'Download PDF'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};