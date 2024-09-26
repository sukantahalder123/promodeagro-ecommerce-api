const { PDFDocument, rgb } = require('pdf-lib');

async function generateBillImage(items) {
    // Calculate the total price and format the items into a string
    let totalPrice = 0;
    let itemsList = items.map(item => {
        let price = parseFloat(item.price);
        let quantity = parseInt(item.quantity);
        let subtotal = price * quantity;
        totalPrice += subtotal;

        // Return the formatted details for each item
        return {
            name: item.productName,
            price: price.toFixed(2),
            quantity: quantity.toString(),
            subtotal: subtotal.toFixed(2)
        };
    });

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([800, 600]); // Set the page size
    const { width, height } = page.getSize();

    // Draw header
    page.drawText('Your Bill', {
        x: 40,
        y: height - 40,
        size: 28,
        color: rgb(0, 0, 0),
    });

    // Draw table headers
    page.drawText('Item', { x: 40, y: height - 80, size: 18, color: rgb(0, 0, 0) });
    page.drawText('Price', { x: 400, y: height - 80, size: 18, color: rgb(0, 0, 0) });
    page.drawText('Qty', { x: 500, y: height - 80, size: 18, color: rgb(0, 0, 0) });
    page.drawText('Subtotal', { x: 600, y: height - 80, size: 18, color: rgb(0, 0, 0) });

    // Draw table rows
    itemsList.forEach((item, index) => {
        const y = height - 120 - (index * 20);
        page.drawText(item.name, { x: 40, y, size: 16, color: rgb(0, 0, 0) });
        page.drawText(item.price, { x: 400, y, size: 16, color: rgb(0, 0, 0) });
        page.drawText(item.quantity, { x: 500, y, size: 16, color: rgb(0, 0, 0) });
        page.drawText(item.subtotal, { x: 600, y, size: 16, color: rgb(0, 0, 0) });
    });

    // Draw total
    page.drawText(`Total: ${totalPrice.toFixed(2)}`, {
        x: 600,
        y: height - 120 - (itemsList.length * 20) - 20,
        size: 18,
        color: rgb(0, 0, 0),
    });

    // Serialize the document to bytes
    const pdfBytes = await pdfDoc.save();

    // Return the content as a Buffer
    return pdfBytes;
}

module.exports = { generateBillImage };
