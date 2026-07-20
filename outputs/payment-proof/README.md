# Payment proof and order history setup

Import `../n8n_workflow_chaphranakhon_branch_history_payment_proof_v10_clean_import.json` as a new workflow, then activate it after setting the required Google Drive folder ID.

## Required columns in `Orders`

Add these headers to the `Orders` sheet exactly as written. Existing rows may be left blank.

| Header | Purpose |
| --- | --- |
| `Payment_Status` | Suggested values: `รอชำระเงิน`, `Submitted`, `Verified`, `Rejected` |
| `Payment_Proof_URL` | Google Drive URL of the submitted slip |
| `Payment_Proof_File_ID` | Google Drive file ID |
| `Payment_Submitted_At` | Time the branch submitted the proof |
| `Payment_Amount` | Transfer amount entered by the branch |
| `Payment_Transfer_At` | Transfer date/time entered by the branch |
| `Payment_Note` | Optional branch note |

## Google Drive folder

The workflow is preconfigured to store payment proofs in the Google Drive folder `หลักฐานการโอนเงิน` (`1a5ILurYSpmlbIud7sF8rMSVeHvNDUrPQ`).

The Google Drive and Google Sheets credentials used by the workflow must have Editor access to that folder and the database spreadsheet.

## Rich Menu routes

Use `outputs/rich-menu/rich_menu_transfer_proof.json`. It opens the existing Branch LIFF with:

- `?screen=history` for order history
- `?screen=payment-proof` for payment proof upload
