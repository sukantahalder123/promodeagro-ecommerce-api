const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

/**
 * Generates a PDF from an HTML template with CSS styling and saves it locally.
 * 
 * @param {Object} orderData - The order data to include in the PDF.
 * @param {string} outputFolder - The folder where the PDF will be saved.
 * @returns {string} - The local file path of the saved PDF.
 */
async function generateAndSavePDF(orderData, outputFolder) {
  // Define the HTML template with inline CSS
  const invoiceHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
        }
        .logo-box {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .logo-box img {
          width: 50px;
          height: 50px;
          margin-right: 10px;
        }
        .items table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        .items th, .items td {
          padding: 10px;
          text-align: left;
          border: 1px solid #ddd;
        }
        .items tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        .header h1 {
          margin: 0;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 12px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-box">
          <img src="https://your-logo-url.com/logo.png" alt="Logo">
          <h1>Promode Agro Farms</h1>
        </div>
        <h2>Invoice</h2>
      </div>
      <p><strong>Order ID:</strong> ${orderData.id}</p>
      <p><strong>Customer Name:</strong> ${orderData.customerName}</p>
      <p><strong>Phone Number:</strong> ${orderData.customerNumber}</p>
      <p><strong>Address:</strong> ${orderData.address.address}, ${orderData.address.landmark_area}, ${orderData.address.zipCode}</p>
      <p><strong>Date & Time:</strong> ${new Date(orderData.createdAt).toLocaleString()}</p>
      <div class="items">
        <h3>Items</h3>
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Product Name</th>
              <th>Quantity</th>
              <th>Rate</th>
              <th>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${orderData.items
              .map(
                (item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.productName}</td>
                  <td>${item.quantity} ${item.unit}</td>
                  <td>₹${item.price}</td>
                  <td>₹${item.subtotal}</td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <div class="footer">
        <p>Thank you for shopping with Promode Agro Farms!</p>
      </div>
    </body>
    </html>
  `;

  try {
    // Launch Puppeteer browser instance
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Set HTML content
    await page.setContent(invoiceHTML, { waitUntil: "networkidle0" });

    // Generate PDF buffer
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    // Close Puppeteer browser
    await browser.close();

    // Define file path and save PDF
    const fileName = `invoice_${orderData.id}.pdf`;
    const filePath = path.join(outputFolder, fileName);
    fs.writeFileSync(filePath, pdfBuffer);

    console.log(`PDF saved locally at: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error("Error generating and saving PDF:", error);
    throw new Error("Failed to generate and save PDF.");
  }
}

(async () => {
  const orderData = {
    id: "12345",
    customerName: "John Doe",
    customerNumber: "9876543210",
    address: {
      address: "123 Main Street",
      landmark_area: "Downtown",
      zipCode: "123456",
    },
    createdAt: new Date().toISOString(),
    items: [
      { productName: "Apple", quantity: 2, unit: "kg", price: 120, subtotal: 240 },
      { productName: "Orange", quantity: 1, unit: "kg", price: 80, subtotal: 80 },
    ],
  };

  const outputFolder = __dirname; // Save in the same folder as this script

  try {
    const filePath = await generateAndSavePDF(orderData, outputFolder);
    console.log(`PDF created and saved at: ${filePath}`);
  } catch (error) {
    console.error("Error:", error.message);
  }
})();
