import React from 'react';
import { Modal } from '../ui/Modal';

interface OrderBlock {
  customerName: string | null;
  customerAddress: string | null;
  date: string | null;
  items: { name: string; rate: number; qty: number }[];
  notes: string | null;
}

interface MultiOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderBlock[];
  onSelectOrder: (order: OrderBlock) => void;
}

export function MultiOrderModal({ isOpen, onClose, orders, onSelectOrder }: MultiOrderModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Multiple Orders Found (${orders.length})`}>
      <div className="space-y-4">
        {orders.map((order, idx) => {
          const itemCount = order.items.length;
          const valueTotal = order.items.reduce((acc, curr) => acc + (curr.rate * curr.qty), 0);
          
          return (
            <div key={idx} className="border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between hover:shadow-md transition">
              <div className="mb-4 md:mb-0">
                <h3 className="text-lg font-bold text-gray-800">
                  {order.customerName || 'Unknown Outlet'}
                </h3>
                <p className="text-sm text-gray-500">
                  {order.customerAddress && <span className="mr-3">📍 {order.customerAddress}</span>}
                  {order.date && <span>📅 {order.date}</span>}
                </p>
                <div className="mt-2 text-sm text-gray-600 font-medium">
                  <span className="mr-4">Items: {itemCount}</span>
                  <span>Value: ₹{valueTotal.toFixed(2)}</span>
                </div>
              </div>
              
              <button
                onClick={() => onSelectOrder(order)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition font-medium whitespace-nowrap self-start md:self-auto"
              >
                Load Invoice
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg transition font-medium"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
