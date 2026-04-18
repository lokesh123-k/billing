import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import puppeteer from 'puppeteer';

const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}${day}-${random}`;
};

export const createInvoice = async (req, res) => {
  try {
    const { customerId, items, pricingType, gstEnabled } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    let subtotal = 0;
    let totalGst = 0;

    const invoiceItems = items.map(item => {
      const itemTotal = item.price * item.quantity;
      const itemGst = gstEnabled ? (item.price * item.quantity * item.gstPercentage) / 100 : 0;
      
      subtotal += itemTotal;
      totalGst += itemGst;

      return {
        product: item.productId,
        name: item.name,
        serialNumber: item.serialNumber,
        price: item.price,
        gstPercentage: item.gstPercentage,
        quantity: item.quantity,
        total: itemTotal + itemGst
      };
    });

    const grandTotal = subtotal + totalGst;

    const invoice = new Invoice({
      invoiceNumber: generateInvoiceNumber(),
      customer: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      items: invoiceItems,
      subtotal,
      totalGst,
      grandTotal,
      gstEnabled,
      pricingType
    });

    await invoice.save();

    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity }
      });
    }
    res.status(201).json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().populate('customer').sort({ createdAt: -1 });
    res.json({ success: true, invoices });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('customer');
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate + 'T23:59:59')
        }
      };
    } else if (startDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate)
        }
      };
    } else if (endDate) {
      dateFilter = {
        createdAt: {
          $lte: new Date(endDate + 'T23:59:59')
        }
      };
    }

    const invoices = await Invoice.find(dateFilter).sort({ createdAt: -1 });
    
    const totalSales = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const totalGst = invoices.reduce((sum, inv) => sum + inv.totalGst, 0);
    const totalSubtotal = invoices.reduce((sum, inv) => sum + inv.subtotal, 0);
    const invoiceCount = invoices.length;
    
    const productSales = {};
    invoices.forEach(invoice => {
      invoice.items.forEach(item => {
        if (productSales[item.name]) {
          productSales[item.name].quantity += item.quantity;
          productSales[item.name].total += item.total;
        } else {
          productSales[item.name] = {
            quantity: item.quantity,
            total: item.total
          };
        }
      });
    });

    const topProducts = Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    res.json({
      success: true,
      report: {
        totalSales,
        totalGst,
        totalSubtotal,
        invoiceCount,
        topProducts,
        invoices
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const generatePDF = async (req, res) => {
  let browser;
  try {
    const invoice = await Invoice.findById(req.params.id).populate('customer');
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const itemsHtml = invoice.items.map((item, index) => `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.serialNumber}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">₹${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.gstPercentage}%</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">₹${item.total.toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; }
          .invoice-container { max-width: 800px; margin: 0 auto; border: 2px solid #2c3e50; }
          .header { background: #2c3e50; color: white; padding: 30px; display: flex; justify-content: space-between; align-items: center; }
          .company-info h1 { font-size: 28px; margin-bottom: 5px; }
          .company-info p { font-size: 14px; opacity: 0.8; }
          .invoice-title { font-size: 32px; font-weight: bold; }
          .invoice-details { padding: 30px; display: flex; justify-content: space-between; }
          .detail-section h3 { color: #2c3e50; font-size: 14px; margin-bottom: 10px; border-bottom: 2px solid #2c3e50; padding-bottom: 5px; }
          .detail-section p { margin: 5px 0; font-size: 14px; }
          .items-table { width: 100%; border-collapse: collapse; }
          .items-table th { background: #34495e; color: white; padding: 12px; text-align: left; font-size: 14px; }
          .items-table td { padding: 10px; border: 1px solid #ddd; font-size: 13px; }
          .totals { padding: 30px; background: #f8f9fa; }
          .totals-row { display: flex; justify-content: flex-end; padding: 8px 0; font-size: 16px; }
          .totals-row.grand-total { font-size: 20px; font-weight: bold; color: #2c3e50; border-top: 2px solid #2c3e50; margin-top: 10px; padding-top: 15px; }
          .footer { padding: 20px 30px; background: #2c3e50; color: white; text-align: center; font-size: 12px; }
          .gst-note { padding: 15px 30px; background: #ecf0f1; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="company-info">
              <h1>⚡ ELECTRICAL ENTERPRISE</h1>
              <p>123 Electrical Road, Industrial Area</p>
              <p>City - 123456 | Phone: (555) 123-4567</p>
            </div>
            <div class="invoice-title">INVOICE</div>
          </div>
          
          <div class="invoice-details">
            <div class="detail-section">
              <h3>Invoice Details</h3>
              <p><strong>Invoice No:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              <p><strong>Pricing:</strong> ${invoice.pricingType.toUpperCase()}</p>
            </div>
            <div class="detail-section">
              <h3>Customer Details</h3>
              <p><strong>Name:</strong> ${invoice.customerName}</p>
              <p><strong>Phone:</strong> ${invoice.customerPhone}</p>
              <p><strong>Address:</strong> ${invoice.customerAddress}</p>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">#</th>
                <th>Product Name</th>
                <th style="width: 120px; text-align: center;">Serial No.</th>
                <th style="width: 80px; text-align: center;">Qty</th>
                <th style="width: 100px; text-align: right;">Price</th>
                <th style="width: 70px; text-align: center;">GST</th>
                <th style="width: 120px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span style="width: 150px;">Subtotal:</span>
              <span style="width: 120px; text-align: right;">₹${invoice.subtotal.toFixed(2)}</span>
            </div>
            ${invoice.gstEnabled ? `
            <div class="totals-row">
              <span style="width: 150px;">Total GST:</span>
              <span style="width: 120px; text-align: right;">₹${invoice.totalGst.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="totals-row grand-total">
              <span style="width: 150px;">Grand Total:</span>
              <span style="width: 120px; text-align: right;">₹${invoice.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          ${invoice.gstEnabled ? `
          <div class="gst-note">
            <strong>Note:</strong> GST has been applied as per ${invoice.pricingType} pricing. Thank you for your business!
          </div>
          ` : ''}

          <div class="footer">
            <p>Thank you for choosing Electrical Enterprise!</p>
            <p>For any queries, contact us at billing@electricalenterprise.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    browser = await puppeteer.launch({ 
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    });
    const page = await browser.newPage();
    
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await page.emulateMediaType('screen');
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' }
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    console.error('PDF Generation Error:', error.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    res.status(500).json({ message: 'PDF generation failed. Please try again.' });
  }
};

export const generatePrintHTML = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('customer');
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const itemsHtml = invoice.items.map((item, index) => `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.serialNumber}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">₹${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.gstPercentage}%</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">₹${item.total.toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #333; }
          .invoice-container { max-width: 800px; margin: 0 auto; border: 2px solid #2c3e50; }
          .header { background: #2c3e50; color: white; padding: 25px; display: flex; justify-content: space-between; align-items: center; }
          .company-info h1 { font-size: 24px; margin-bottom: 5px; }
          .company-info p { font-size: 12px; opacity: 0.8; }
          .invoice-title { font-size: 28px; font-weight: bold; }
          .invoice-details { padding: 20px; display: flex; justify-content: space-between; }
          .detail-section h3 { color: #2c3e50; font-size: 12px; margin-bottom: 8px; border-bottom: 2px solid #2c3e50; padding-bottom: 4px; }
          .detail-section p { margin: 4px 0; font-size: 12px; }
          .items-table { width: 100%; border-collapse: collapse; }
          .items-table th { background: #34495e; color: white; padding: 10px; text-align: left; font-size: 12px; }
          .items-table td { padding: 8px; border: 1px solid #ddd; font-size: 11px; }
          .totals { padding: 20px; background: #f8f9fa; text-align: right; }
          .totals-row { padding: 6px 0; font-size: 14px; }
          .totals-row.grand-total { font-size: 18px; font-weight: bold; color: #2c3e50; border-top: 2px solid #2c3e50; margin-top: 10px; padding-top: 12px; }
          .footer { padding: 15px 20px; background: #2c3e50; color: white; text-align: center; font-size: 11px; }
          .print-btn { position: fixed; top: 20px; right: 20px; padding: 12px 24px; background: #2c3e50; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
          .print-btn:hover { background: #34495e; }
          @media print { .print-btn { display: none; } }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">Print Invoice</button>
        <div class="invoice-container">
          <div class="header">
            <div class="company-info">
              <h1>ELECTRICAL ENTERPRISE</h1>
              <p>123 Electrical Road, Industrial Area</p>
              <p>City - 123456 | Phone: (555) 123-4567</p>
            </div>
            <div class="invoice-title">INVOICE</div>
          </div>
          
          <div class="invoice-details">
            <div class="detail-section">
              <h3>Invoice Details</h3>
              <p><strong>Invoice No:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}</p>
              <p><strong>Pricing:</strong> ${invoice.pricingType.toUpperCase()}</p>
            </div>
            <div class="detail-section">
              <h3>Customer Details</h3>
              <p><strong>Name:</strong> ${invoice.customerName}</p>
              <p><strong>Phone:</strong> ${invoice.customerPhone}</p>
              <p><strong>Address:</strong> ${invoice.customerAddress}</p>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th>Product</th>
                <th style="width: 100px; text-align: center;">Serial No</th>
                <th style="width: 60px; text-align: center;">Qty</th>
                <th style="width: 80px; text-align: right;">Price</th>
                <th style="width: 60px; text-align: center;">GST</th>
                <th style="width: 100px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">Subtotal: ₹${invoice.subtotal.toFixed(2)}</div>
            ${invoice.gstEnabled ? `<div class="totals-row">Total GST: ₹${invoice.totalGst.toFixed(2)}</div>` : ''}
            <div class="totals-row grand-total">Grand Total: ₹${invoice.grandTotal.toFixed(2)}</div>
          </div>

          <div class="footer">
            <p>Thank you for choosing Electrical Enterprise!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Print HTML Error:', error.message);
    res.status(500).json({ message: 'Failed to generate print view' });
  }
};