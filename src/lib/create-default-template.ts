import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

export function createDefaultInvoiceTemplate(): ArrayBuffer {
  // Create a simple Word document structure
  const content = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <!-- Header -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:sz w:val="32"/>
          <w:b/>
          <w:color w:val="b5bf47"/>
        </w:rPr>
        <w:t>FIT INFINITY</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:t>Fitness Center &amp; Personal Training</w:t>
      </w:r>
    </w:p>
    
    <!-- Invoice Title -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="480"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:sz w:val="28"/>
          <w:b/>
        </w:rPr>
        <w:t>INVOICE</w:t>
      </w:r>
    </w:p>
    
    <!-- Invoice Details -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="240"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>Bill To:</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>{memberName}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>{memberEmail}</w:t>
      </w:r>
    </w:p>
    
    <!-- Invoice Info -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="240"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>Invoice Details:</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Invoice ID: {invoiceId}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Date: {createdDate}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Status: {paymentStatus}</w:t>
      </w:r>
    </w:p>
    
    <!-- Subscription Details -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="240"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>Subscription Details:</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Package: {packageName}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Type: {subscriptionType}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Trainer: {trainerName}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Duration: {duration}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Period: {startDate} - {endDate}</w:t>
      </w:r>
    </w:p>
    
    <!-- Payment Information -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="240"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>Payment Information:</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Method: {paymentMethod}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Status: {paymentStatus}</w:t>
      </w:r>
    </w:p>
    
    <!-- Financial Summary -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="240"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>Financial Summary:</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Subtotal: {subtotal}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Tax: {tax}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>Total: {total}</w:t>
      </w:r>
    </w:p>
    
    <!-- Footer -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="480"/>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:sz w:val="16"/>
          <w:color w:val="666666"/>
        </w:rPr>
        <w:t>Generated on: {generatedDate}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:sz w:val="16"/>
          <w:color w:val="666666"/>
        </w:rPr>
        <w:t>Thank you for your business!</w:t>
      </w:r>
    </w:p>
    
  </w:body>
</w:document>`;

  // Create basic Word document structure
  const zip = new PizZip();
  
  // Add required files for a minimal Word document
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.file("word/document.xml", content);
  
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);

  return zip.generate({ type: "arraybuffer" });
}