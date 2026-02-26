# ORS (On Road Support) - Genesys Cloud Flow Setup Guide
**Ahold Delhaize | On Road Support | Created: 2026-02-26**

---

## Overview

Three flows created:
| File | Type | Description |
|------|------|-------------|
| `ORS_Main_Inbound.yaml` | inboundCall | Main flow: Language selection (EN/ES), schedule check, DNIS routing (Driver/CC), upfront message, greeting, queue transfer |
| `ORS_Driver_InQueue.yaml` | inQueueCall | Driver queue: supervisor upfront msg + hold music loop |
| `ORS_CustomerCare_InQueue.yaml` | inQueueCall | CC queue: supervisor upfront msg + 60s hold + patience msg loop |

---

## Call Flow Logic

```
Caller dials in (Driver DID: 888-722-9985 | CC DID: 833-284-9972)
    │
    ▼
[Language Selection]
  Press 1 → English (Jill TTS)
  Press 2 → Spanish (Isabel TTS)
  No input → Default English
    │
    ▼
[Schedule Group Check - ORS_Schedule_Group]
  ├── Emergency → Play emergency closed msg → Disconnect
  ├── Holiday   → Play holiday closed msg → Disconnect
  ├── Closed    → Play closed msg → Disconnect
  └── Open ─────────────────────────────────────────────┐
                                                         │
    ▼                                                    │
[DNIS Check] ◄───────────────────────────────────────────┘
  ├── Driver DID (888-722-9985) → CallType = "driver"
  └── CC DID (833-284-9972)    → CallType = "customercare"
    │
    ▼
[Upfront Message Check - VJ_claudeDatatable key: ORS_UPFRONT_MSG]
  ├── Active=true  → Play upfront message → Continue
  └── Active=false → Skip → Continue
    │
    ▼
[Greeting + Queue Transfer]
  ├── Driver → "You have reached On Road Support..." → ORS_Driver_Queue
  └── CC     → "You have reached On Road Support..." → ORS_CustomerCare_Queue
```

---

## STEP 1: Fix OAuth Credentials

The OAuth client credentials returned `invalid_client` error today.
Go to: **Genesys Cloud Admin → Integrations → OAuth**

1. Find `Claude_Exploration_Vijay` client (ID: `c710e83c-7d3d-4910-bdf5-b6d4f634c959`)
2. Click **Regenerate Secret**
3. Copy the new secret
4. Update `C:\Users\VijayBandaru\.archy_config` with the new secret
5. Update the secret in this guide for use in deployment commands

---

## STEP 2: Create Required Resources in Genesys Cloud UI

### A. Create Schedule (Admin → Architect → Schedules)
- **Name**: ORS_Schedule
- **Time Zone**: America/Chicago (CST)
- **Recurrence**: Daily, every day
- **Open**: 5:00 AM
- **Close**: 11:00 PM (adjust based on actual delivery windows)
- Save and note the **Schedule ID**

### B. Create Schedule Group (Admin → Architect → Schedule Groups)
- **Name**: ORS_Schedule_Group
- **Division**: Claude_Exploration_Vijay
- **Open Schedules**: Add `ORS_Schedule`
- Save and note the **Schedule Group ID**

### C. Create Queues (Admin → Contact Center → Queues)

**Queue 1 - ORS Driver Queue:**
- **Name**: ORS_Driver_Queue
- **Division**: Claude_Exploration_Vijay
- **Media Type**: Voice
- **In-Queue Flow**: (leave blank for now, assign after deploying ORS_Driver_InQueue)
- Save and note the **Queue ID**

**Queue 2 - ORS Customer Care Queue:**
- **Name**: ORS_CustomerCare_Queue
- **Division**: Claude_Exploration_Vijay
- **Media Type**: Voice
- **In-Queue Flow**: (leave blank for now, assign after deploying ORS_CustomerCare_InQueue)
- Save and note the **Queue ID**

---

## STEP 3: Update YAML with Resource IDs

Edit `ORS_Main_Inbound.yaml` and replace:
```yaml
# In Schedule_Check_20 task:
id: REPLACE_WITH_ORS_SCHEDULE_GROUP_ID   → Replace with actual Schedule Group UUID

# In Driver_Greeting_70 task (optional, name-based lookup may work):
name: ORS_Driver_Queue                   → Keep or add: id: <DRIVER_QUEUE_UUID>

# In CC_Greeting_71 task:
name: ORS_CustomerCare_Queue             → Keep or add: id: <CC_QUEUE_UUID>
```

Run this PowerShell to update the YAML:
```powershell
# Update schedule group ID
$yaml = Get-Content "C:\Users\VijayBandaru\ORS_Main_Inbound.yaml" -Raw
$yaml = $yaml -replace 'REPLACE_WITH_ORS_SCHEDULE_GROUP_ID', 'YOUR-SCHEDULE-GROUP-UUID-HERE'
Set-Content "C:\Users\VijayBandaru\ORS_Main_Inbound.yaml" $yaml
```

---

## STEP 4: Add Data Table Rows (Optional - for Upfront Messages)

In the existing data table `VJ_claudeDatatable` (ID: `a698670c-8b83-4ddb-af04-04f67eee0c78`), add these rows via Genesys UI (Admin → Architect → Data Tables → VJ_claudeDatatable):

| key | Active | Message |
|-----|--------|---------|
| ORS_UPFRONT_MSG | false | Important notice: On Road Support service update. Please listen carefully. |
| ORS_DRIVER_INQUEUE_MSG | false | Important driver support information. A representative will assist you shortly. |
| ORS_CC_INQUEUE_MSG | false | Important customer care information. A representative will assist you shortly. |

> **Note**: Set `Active = true` to enable any upfront message. Supervisors can toggle this in real-time.

---

## STEP 5: Deploy Flows with Archy

Deploy in this order (in-queue flows first, then main flow):

```bash
# 1. Deploy Driver InQueue
"C:\Users\VijayBandaru\archy\archyBin\archy-win-2.37.0.exe" publish \
  --file "C:\Users\VijayBandaru\ORS_Driver_InQueue.yaml" \
  --forceUnlock

# 2. Deploy CustomerCare InQueue
"C:\Users\VijayBandaru\archy\archyBin\archy-win-2.37.0.exe" publish \
  --file "C:\Users\VijayBandaru\ORS_CustomerCare_InQueue.yaml" \
  --forceUnlock

# 3. Deploy Main Inbound (after updating schedule group ID in YAML)
"C:\Users\VijayBandaru\archy\archyBin\archy-win-2.37.0.exe" publish \
  --file "C:\Users\VijayBandaru\ORS_Main_Inbound.yaml" \
  --forceUnlock
```

---

## STEP 6: Post-Deployment Configuration

### Assign In-Queue Flows to Queues
1. Go to Admin → Contact Center → Queues
2. Edit `ORS_Driver_Queue` → set **In-Queue Flow** = `ORS_Driver_InQueue`
3. Edit `ORS_CustomerCare_Queue` → set **In-Queue Flow** = `ORS_CustomerCare_InQueue`

### Assign DIDs to the Main Flow
1. Go to Admin → Telephony → DIDs
2. Assign DID `+18887229985` (Driver) → Route to `ORS_Main_Inbound` flow
3. Assign DID `+18332849972` (Customer Care) → Route to `ORS_Main_Inbound` flow

---

## Bilingual TTS Configuration

| Language | TTS Engine | Voice |
|----------|-----------|-------|
| English (en-us) | Genesys TTS | Jill |
| Spanish (es-us) | Genesys TTS | Isabel |

The caller selects language at the start. The `setLanguage` action switches the active TTS engine for all subsequent prompts. Spanish prompts in the flow currently use English text — for full bilingual experience, update the closed/emergency/greeting TTS prompts with Spanish translations (see translations below).

### Spanish Translations Reference
| Message | English | Spanish |
|---------|---------|---------|
| Language prompt | "For English, press 1. Para Español, oprima 2." | (already bilingual) |
| Greeting | "You have reached On Road Support. Your call may be recorded." | "Se ha comunicado con On Road Support. Su llamada puede ser grabada." |
| Driver Closed | "We open at 5:00 AM Eastern time, when the customer delivery window opens." | "Abrimos a las 5:00 AM, hora del Este, cuando se abre la ventana de entrega." |
| Driver Emergency | "Currently unavailable due to an unplanned emergency. Contact local facility." | "No disponibles por emergencia imprevista. Comuníquese con la instalación local." |
| CC Closed | "We open at 5:00 AM Eastern time." | "Abrimos a las 5:00 AM, hora del Este." |
| CC Emergency | "Unavailable due to emergency. Contact your customer care manager." | "No disponibles por emergencia. Comuníquese con su gerente de atención al cliente." |
| Patience (InQueue) | "Thanks for your patience. Representatives are busy. Please remain on the line." | "Gracias por su paciencia. Nuestros representantes están ocupados. Por favor, permanezca en la línea." |

---

## Files Created
```
C:\Users\VijayBandaru\ORS_Main_Inbound.yaml          ← Main inbound flow
C:\Users\VijayBandaru\ORS_Driver_InQueue.yaml         ← Driver queue in-queue
C:\Users\VijayBandaru\ORS_CustomerCare_InQueue.yaml   ← CC queue in-queue
C:\Users\VijayBandaru\ORS_SETUP_AND_DEPLOY_GUIDE.md  ← This guide
```
