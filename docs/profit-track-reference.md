# Profit Track Reference

Notes from the legacy Profit Track POS system (by Independent Solutions) previously used at Crisp on Creek. This documents export formats, department structure, hardware config, and data migration paths.

## Store Details (from PT exports)

- **Store**: CRISP ON CREEK
- **Address**: 1164 Cavendish Road, Mt Gravatt East QLD 4122
- **Phone**: (07) 3849 1496
- **ABN**: 17 218 989 357
- **Lane**: #09
- **Trading hours**: 6am - 7pm daily

## Sales Export CSV Format

PT exports sales data as CSV with a 2-line header block:

```
Store Name,Store Address,Creation Date/Time,Reporting Period
CRISP ON CREEK,1164 CAVENDISH ROAD; MT GRAVATT EAST QLD 4122,16/06/2025 11:35:39,06/06/2025 - 06/06/2025

Transaction Date/Time,Transaction ID,Description,PLU,Product Code,Cost,Sale Amount ($),Qty
06/06/2025 06:09:21,71230,JACOBS EGG CAGE 800G,9332022008001,19513,0.00,8.50,1.00
```

**Columns:**
| Column | Description |
|---|---|
| Transaction Date/Time | `DD/MM/YYYY HH:MM:SS` format |
| Transaction ID | Numeric, incrementing (e.g. 71230) |
| Description | Product name (all caps) |
| PLU | Barcode / EAN-13 |
| Product Code | Internal PT product code |
| Cost | Cost price (often 0.00 in exports) |
| Sale Amount ($) | Sell price per unit (tax-inclusive) |
| Qty | Quantity sold (1.00, can be fractional for weighed items) |

## Department Structure (from PT XLS reports)

PT organises products into numbered departments. The `pt_daily_export.py` script maps these to website categories:

| PT Department | Website Category |
|---|---|
| 1.FRUIT | Fruit |
| 2.VEGIES | Vegetables |
| 3.HERBS FRESH | Fresh Herbs |
| 4.DELI | Deli |
| 5.DELI SERVICE | Deli |
| 6.GROCERY | Grocery |
| 7.FREEZER | Freezer |
| 8.FLOWERS | Flowers |
| 9.NUTS | Nuts & Snacks |
| 10.CONFECT | Confectionery |
| 11.BREAD | Bread & Bakery |
| 12.TUB/DRIED FRUIT | Dried Fruit & Nuts |
| 13.MILK | Dairy |
| 14.EGGS | Eggs |
| 15.JUICE FRESH O.J. | Fresh Juice |
| 15. BAGS | Fruit Packs |
| 16.DRINKS | Drinks |
| 17.NEWSAGENT | Newsagent |
| 22.FRUIT WHOLESALE | Fruit |
| 23.VEGIES WHOLESALE | Vegetables |
| CARDS | Cards & Ice Cream |
| COFFEE | Coffee |
| MEAT | Meat |
| UBER EATS | (excluded) |

## XLS Report Formats

PT auto-exports two XLS reports for the website sync pipeline:

### Customer Price List
Contains all products with pricing. Column layout (0-indexed):
- Col 1: PCode (product code)
- Col 2: Product description
- Col 9: PLU (barcode)
- Col 12: Normal sell price
- Col 13: Special sell price
- Col 15: Special end date
- Col 16: Unit price

Department headers appear as rows with Col 3 = "Department:", Col 6 = name.
Group headers appear as rows with Col 3 = "Group:", Col 6 = name.
Data starts at row 4.

### Top Products
Contains best sellers with sales stats. Column layout:
- Col 0: PCode
- Col 3: Product description
- Col 7: Sales (inc GST)
- Col 18: Qty
- Col 21: Rank

## Daily Export Pipeline (pt_daily_export.py)

A Python script that ran on the POS server via Windows Task Scheduler:

1. Reads XLS exports from `C:\ProgramData\Independent Solutions\Profit-Track\DailyExport\`
2. Parses products and prices into JSON
3. Writes `products.json` and `top_products.json`
4. Commits and pushes to the GitHub Pages repo (`crisponcreek`)

Dependencies: `xlrd`, `gitpython` (Python 3.8+)

The website at `matthiascamp.github.io/crisponcreek` uses these JSON files to display current prices.

## Receipt Format

From PT receipt logs, the receipt layout is:

```
            WELCOME TO
   CRISP ON CREEK
        PH# (07) 3849 1496

           TAX INVOICE
       ABN# 17 218 989 357

(*) denotes items which attract GST
30/06/2013 02:24pm              Sunday

[item lines]

Total                           $X.XX
Served by [STAFF]               Lane #09
Receipt Number                  00001383
------------------------------------------

          TRADING HOURS
            7AM TO 7PM
         HAVE A NICE DAY
```

## Hardware Notes

### CashGuard (Cash Drawer/Note Handler)
PT used CashGuard hardware via the `cashbipro` communication driver:
- Config file: `cashbipro.ini`
- Communication: Socket or serial port based
- Status polling: every 5 seconds idle, every second when money inserted
- Lost connection timeout: 15 seconds (configurable)
- Protocol logging: optional `CGProt_Day.log`
- Language file: `cglang.ini` (multi-language support: EN, ES, NO, SE)

### EFTPOS
- Integrated EFTPOS terminal
- Logs: `eftpos.log` (mostly open/close timestamps in available exports)

### Devices
- Device detection logged in `device.log`
- Additional logs: `keypress.log`, `ports.log`, `SystemMonitor.log`, `KitchenSrv.log`

## Database

PT uses Firebird database (`master.fdb`). The `.fdb` file is not included in this repo but the export CSVs and XLS pipeline provide the data migration path.

## Promotion Templates

PT includes a social media promotion template for weekly specials posts:

```
Here's our weekly update from Crisp on Creek in Mt Gravatt.
We're open 6am-7pm every day.

This week's specials include:
- [item 1]
- [item 2]
...

We can put together a custom fruit & veg box based on your
budget or preferences.
```

## Migration Path

To migrate PT data into mcpos:

1. **Products**: Export "Customer Price List" XLS from PT, or use the existing `products.json` from the website. Run `node migrate-from-pt.js [path]` which bulk-imports into the SQLite database.

2. **Sales history**: Use the CSV sales exports. Format documented above. Can be imported programmatically if historical reporting is needed.

3. **Keyboard layout**: The mcpos `db/schema.sql` seeds a keyboard layout that mirrors the PT register button arrangement (function row, department buttons, numpad, bottom nav).
