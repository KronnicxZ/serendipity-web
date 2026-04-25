import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host:   'pro206.emailserver.vn',
  port:   587,
  secure: false,
  auth:   { user: 'sofia@serendipity.vn', pass: 'uU99-twnvJ' },
  tls:    { rejectUnauthorized: false },
});

export interface ShortageItem {
  name:       string;
  type:       'CHEMICAL' | 'LEATHER';
  needed:     number;
  available:  number;
  unit:       string;
}

interface POContext {
  po_number:    string;
  article_name: string;
  sf_target:    number;
  owner:        string;
}

export const MesNotifyService = {

  /** Notify Tuyen to order + Thanh to approve — sent as Sofia */
  async notifyShortage(po: POContext, shortages: ShortageItem[]): Promise<void> {
    const chemLines   = shortages.filter(s => s.type === 'CHEMICAL');
    const leatherLines = shortages.filter(s => s.type === 'LEATHER');

    const formatList = (items: ShortageItem[]) =>
      items.map(s =>
        `  - ${s.name}: need ${s.needed.toFixed(2)} ${s.unit}, have ${s.available.toFixed(2)} ${s.unit} → shortage ${(s.needed - s.available).toFixed(2)} ${s.unit}`
      ).join('\n');

    const body = `Hi Tuyen,

Production Order ${po.po_number} has been reviewed and cannot start due to insufficient inventory.

Article: ${po.article_name}
Target:  ${po.sf_target} SF
Owner:   ${po.owner}

${chemLines.length ? `CHEMICAL SHORTAGES:\n${formatList(chemLines)}\n` : ''}${leatherLines.length ? `\nLEATHER/CRUST SHORTAGES:\n${formatList(leatherLines)}\n` : ''}
Please arrange the purchase and confirm with Thanh before marking the PO as ready.

System-generated alert.

—
Sofia — Serendipity Group
sofia@serendipity.vn`;

    await transporter.sendMail({
      from:    '"Sofia — Serendipity" <sofia@serendipity.vn>',
      to:      'info@serendipity.vn',
      cc:      'campanerasanti@gmail.com',
      subject: `⚠️ Inventory Shortage — ${po.po_number} cannot start`,
      text:    body,
    });
  },

  /** Notify Thanh (when we have his email) + Santi that PO is ready */
  async notifyProductionReady(po: POContext, thanhEmail?: string): Promise<void> {
    const to = thanhEmail ?? 'campanerasanti@gmail.com';

    await transporter.sendMail({
      from:    '"Sofia — Serendipity" <sofia@serendipity.vn>',
      to,
      cc:      'campanerasanti@gmail.com',
      subject: `✅ Ready to produce — ${po.po_number}`,
      text: `Hi Thanh,

All materials are confirmed for ${po.po_number}.

Article: ${po.article_name}
Target:  ${po.sf_target} SF
Owner:   ${po.owner}

You can begin the batch from the mobile app (/lab/mobile).

—
Sofia — Serendipity Group`,
    });
  },

  /** Notify packing team when batch is complete */
  async notifyPackingReady(po_number: string, sf_produced: number): Promise<void> {
    await transporter.sendMail({
      from:    '"Sofia — Serendipity" <sofia@serendipity.vn>',
      to:      'info@serendipity.vn',
      cc:      'campanerasanti@gmail.com',
      subject: `📦 Ready for packing — ${po_number}`,
      text: `Batch complete for ${po_number}.\n\nSF produced: ${sf_produced}\n\nPlease proceed with measuring and packing.\n\n— Sofia`,
    });
  },
};
