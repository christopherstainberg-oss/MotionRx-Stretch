/**
 * Generates src/data/medication-bases.ts from compact clinical drug rows.
 * Run: node scripts/gen-medications.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** slug|generic|brands^|class|primary|offLabel^|routes^|strengths^|evidence|ptNotes|schedule */
const ROWS = `
acetaminophen|Acetaminophen|Tylenol^Ofirmev|analgesic-antipyretic|Mild–moderate pain and fever|Migraine adjunct^Post-vaccination fever^OA when NSAIDs contraindicated|oral-tablet^oral-capsule^oral-solution^oral-suspension^rectal^intravenous|325 mg^500 mg^650 mg^1000 mg^10 mg/mL IV|First-line analgesic/antipyretic; hepatotoxicity above max daily dose|Watch total daily dose across products|none
ibuprofen|Ibuprofen|Advil^Motrin|nsaid|Pain, inflammation, fever|Pericarditis specialty^Migraine^Dysmenorrhea|oral-tablet^oral-capsule^oral-suspension^intravenous|100 mg^200 mg^400 mg^600 mg^800 mg|NSAID class GI/renal/CV warnings|May blunt soreness perception; GI/renal risk|none
naproxen|Naproxen|Aleve^Naprosyn|nsaid|Pain and inflammation (longer-acting)|Migraine^Acute gout adjunct|oral-tablet^oral-capsule^oral-suspension|220 mg^250 mg^375 mg^500 mg|Longer half-life NSAID|Bleeding risk with anticoagulants|none
meloxicam|Meloxicam|Mobic|nsaid|OA and RA pain|Other MSK inflammatory pain|oral-tablet^oral-capsule^oral-suspension|7.5 mg^15 mg|Preferential COX-2 at lower doses|Monitor older adults/CKD risk|none
diclofenac|Diclofenac|Voltaren^Cambia|nsaid|Arthritis and acute pain|Topical actinic keratosis (specific products)|oral-tablet^topical-gel^topical-patch^ophthalmic^oral-solution|25 mg^50 mg^75 mg^1% gel^1.3% patch|Topical lower systemic exposure than oral|Topical preferred for local joint targets|none
celecoxib|Celecoxib|Celebrex|nsaid|OA/RA and acute pain (COX-2 selective)|Historical FAP contexts|oral-capsule|50 mg^100 mg^200 mg^400 mg|COX-2 selective; CV risk considerations|May spare GI vs nonselective NSAIDs|none
ketorolac|Ketorolac|Toradol|nsaid|Short-term moderate–severe acute pain|Not for chronic use|oral-tablet^intramuscular^intravenous^nasal^ophthalmic|10 mg oral^15 mg inj^30 mg inj^60 mg IM|Typically ≤5 days combined routes|High GI/renal risk—short term only|none
aspirin|Aspirin|Bayer^Ecotrin|antiplatelet|Antiplatelet CV prevention; analgesic at higher doses|Kawasaki specialty^CRC risk research contexts|oral-tablet^oral-capsule^rectal|81 mg^325 mg^500 mg|Irreversible COX-1 at low dose|Bleeding risk; hold per procedural guidance|none
hydrocodone-acetaminophen|Hydrocodone/Acetaminophen|Norco^Vicodin|opioid-analgesic|Moderate–severe pain when non-opioids insufficient|Avoid routine chronic use without specialist|oral-tablet^oral-solution|5/325 mg^7.5/325 mg^10/325 mg|Schedule II combination opioid|Fall risk, sedation, constipation|II
oxycodone|Oxycodone|OxyContin^Roxicodone|opioid-analgesic|Moderate–severe pain|Cancer and post-op pathways|oral-tablet^oral-capsule^oral-solution|5 mg^10 mg^15 mg^20 mg^30 mg^40 mg ER^80 mg ER|Schedule II; misuse/overdose risk|Sedation and fall risk|II
tramadol|Tramadol|Ultram|opioid-analgesic|Moderate pain|RLS limited^Fibromyalgia adjunct|oral-tablet^oral-capsule|50 mg^100 mg ER^200 mg ER^300 mg ER|Weak opioid + SNRI; seizure/serotonin risk|Sedation; serotonin syndrome risk|IV
morphine|Morphine|MS Contin^Duramorph|opioid-analgesic|Severe acute and cancer pain|PCA and palliative pathways|oral-tablet^oral-solution^intravenous^intramuscular^subcutaneous^rectal^epidural|15 mg^30 mg^60 mg ER^100 mg ER^2 mg/mL IV|Mu agonist; respiratory depression risk|Sedation/fall risk; bowel regimen often needed|II
fentanyl|Fentanyl|Duragesic^Sublimaze|opioid-analgesic|Severe chronic pain (patch); perioperative (IV)|Not for opioid-naïve outpatient patch starts|transdermal^intravenous^sublingual^buccal^nasal|12 mcg/h patch^25 mcg/h^50 mcg/h^100 mcg/h^50 mcg IV|High potency; patch misuse risk|Heat increases patch absorption|II
codeine|Codeine|Tylenol with Codeine|opioid-analgesic|Mild–moderate pain; cough (some products)|Ultra-rapid CYP2D6 risk|oral-tablet^oral-solution|15 mg^30 mg^60 mg|Prodrug to morphine; variable response|Sedation; pediatric cautions|III
hydromorphone|Hydromorphone|Dilaudid|opioid-analgesic|Severe pain|High potency opioid|oral-tablet^oral-solution^intravenous^intramuscular^subcutaneous^rectal|2 mg^4 mg^8 mg^1 mg/mL|Schedule II|High sedation/fall risk|II
oxycodone-acetaminophen|Oxycodone/Acetaminophen|Percocet|opioid-analgesic|Moderate–severe pain|Acetaminophen ceiling dose|oral-tablet^oral-solution|2.5/325 mg^5/325 mg^7.5/325 mg^10/325 mg|Schedule II combo|Acetaminophen max daily|II
buprenorphine|Buprenorphine|Subutex^Butrans^Belbuca|opioid-analgesic|OUD; chronic pain patch|Partial agonist frameworks|sublingual^buccal^transdermal^subcutaneous^intramuscular^intravenous|2 mg SL^8 mg SL^5 mcg/h patch^10 mcg/h^20 mcg/h|Schedule III|Specialist frameworks often|III
naloxone|Naloxone|Narcan^Evzio|opioid-reversal|Opioid overdose reversal|Take-home rescue kits|nasal^intramuscular^intravenous^subcutaneous|2 mg nasal^4 mg nasal^0.4 mg/mL inj|Opioid antagonist|Train family on use|none
naltrexone|Naltrexone|ReVia^Vivitrol|opioid-reversal|Alcohol and opioid use disorder|Must be opioid-free before start|oral-tablet^intramuscular|50 mg oral^380 mg IM monthly|Opioid antagonist|Blocks opioid analgesia|none
cyclobenzaprine|Cyclobenzaprine|Flexeril^Amrix|muscle-relaxant|Short-term adjunct for acute muscle spasm|Fibromyalgia low-dose sleep adjunct|oral-tablet^oral-capsule|5 mg^7.5 mg^10 mg^15 mg ER^30 mg ER|Centrally acting; anticholinergic|Daytime drowsiness/fall risk|none
tizanidine|Tizanidine|Zanaflex|muscle-relaxant|Spasticity (MS, SCI)|Migraine prophylaxis^Myofascial pain|oral-tablet^oral-capsule|2 mg^4 mg^6 mg|Alpha-2 agonist; hypotension/liver monitoring|Hypotension, sedation|none
baclofen|Baclofen|Lioresal^Gablofen|muscle-relaxant|Spasticity|Intrathecal pump specialty^AUD research|oral-tablet^oral-solution^intrathecal|5 mg^10 mg^20 mg^10 mg/20 mL IT|GABA-B; abrupt withdrawal danger|Do not stop abruptly|none
methocarbamol|Methocarbamol|Robaxin|muscle-relaxant|Acute MSK pain with spasm|Limited evidence vs placebo for many MSK pains|oral-tablet^intravenous^intramuscular|500 mg^750 mg^100 mg/mL inj|Centrally acting|Sedation with CNS depressants|none
metaxalone|Metaxalone|Skelaxin|muscle-relaxant|Acute musculoskeletal conditions|Class caveats apply|oral-tablet|400 mg^800 mg|Less sedating for some|Still CNS depression possible|none
carisoprodol|Carisoprodol|Soma|muscle-relaxant|Short-term acute MSK pain|High misuse potential|oral-tablet|250 mg^350 mg|Metabolized to meprobamate|Sedation and dependence risk|IV
orphenadrine|Orphenadrine|Norflex|muscle-relaxant|MSK pain adjunct|Anticholinergic burden|oral-tablet^intravenous^intramuscular|100 mg^30 mg/mL|Centrally acting|Sedation|none
chlorzoxazone|Chlorzoxazone|Parafon Forte|muscle-relaxant|MSK spasm|Hepatotoxicity rare|oral-tablet|250 mg^375 mg^500 mg^750 mg|Centrally acting|Sedation|none
dantrolene|Dantrolene|Dantrium^Ryanodex|muscle-relaxant|Spasticity; malignant hyperthermia|Hepatotoxicity monitoring oral chronic|oral-capsule^intravenous|25 mg^50 mg^100 mg^20 mg IV vial|Peripheral muscle relaxant|Weakness expected|none
diazepam|Diazepam|Valium|benzodiazepine|Anxiety, muscle spasm, seizure, alcohol withdrawal|Spasticity adjunct|oral-tablet^oral-solution^intramuscular^intravenous^rectal|2 mg^5 mg^10 mg^5 mg/mL inj|Long-acting benzo; dependence risk|Major fall/sedation risk with opioids|IV
alprazolam|Alprazolam|Xanax|benzodiazepine|Anxiety and panic|Short-term preferred|oral-tablet^oral-disintegrating^oral-solution|0.25 mg^0.5 mg^1 mg^2 mg^0.5 mg XR^1 mg XR^2 mg XR|High dependence potential|Major fall risk; avoid with opioids|IV
lorazepam|Lorazepam|Ativan|benzodiazepine|Anxiety; status epilepticus IV; agitation|Alcohol withdrawal protocols|oral-tablet^oral-solution^intramuscular^intravenous|0.5 mg^1 mg^2 mg^2 mg/mL inj|Intermediate benzo|Sedation/fall risk|IV
clonazepam|Clonazepam|Klonopin|benzodiazepine|Seizure disorders; panic|RLS/RBD off-label|oral-tablet^oral-disintegrating|0.125 mg^0.25 mg^0.5 mg^1 mg^2 mg|Longer-acting benzo|Morning hangover/fall risk|IV
midazolam|Midazolam|Versed^Nayzilam|benzodiazepine|Procedural sedation; seizure rescue|Hospital/rescue use|intramuscular^intravenous^nasal^buccal^oral-solution|1 mg/mL^5 mg/mL^5 mg nasal|Short-acting benzo|Respiratory depression|IV
prednisone|Prednisone|Deltasone|corticosteroid|Inflammatory, autoimmune, allergic conditions|Short-course MSK and respiratory bursts|oral-tablet^oral-solution|1 mg^2.5 mg^5 mg^10 mg^20 mg^50 mg|Systemic glucocorticoid; HPA suppression risk|Mood, glucose, bone, infection with prolonged use|none
prednisolone|Prednisolone|Orapred^Prelone|corticosteroid|Inflammatory conditions; pediatric liquid common|Asthma exacerbations|oral-tablet^oral-solution^ophthalmic|5 mg^15 mg/5 mL^1% ophth|Active metabolite of prednisone|Same steroid class precautions|none
methylprednisolone|Methylprednisolone|Medrol^Solu-Medrol^Depo-Medrol|corticosteroid|Inflammatory/autoimmune; asthma/COPD flares|Intra-articular and epidural specialty|oral-tablet^intravenous^intramuscular^intra-articular|4 mg^8 mg^16 mg^32 mg^40 mg/mL^125 mg IV|Dose-pack common for MSK flares|Hyperglycemia, mood, infection risk|none
dexamethasone|Dexamethasone|Decadron|corticosteroid|Cerebral edema, antiemetic adjunct, inflammation|Croup^Altitude illness specialty|oral-tablet^oral-solution^intravenous^intramuscular^ophthalmic|0.5 mg^0.75 mg^1 mg^4 mg^10 mg/mL|Long-acting potent glucocorticoid|Sleep disruption, glucose rise|none
triamcinolone|Triamcinolone|Kenalog^Nasacort|corticosteroid|Injection; topical/intranasal allergy|Keloid/dermatology|intramuscular^intra-articular^topical-cream^topical-ointment^nasal|10 mg/mL^40 mg/mL^0.1% cream^55 mcg spray|Common MSK injection steroid|Post-injection flare possible|none
hydrocortisone|Hydrocortisone|Cortef^Solu-Cortef|corticosteroid|Adrenal insufficiency; topical inflammation|Stress-dose education|oral-tablet^intravenous^intramuscular^topical-cream|5 mg^10 mg^20 mg^100 mg IV^1% cream|Physiologic vs anti-inflammatory dosing differs|Know stress-dose plan if adrenal insufficient|none
warfarin|Warfarin|Coumadin^Jantoven|anticoagulant|VTE and AF stroke prevention|Mechanical valves many protocols|oral-tablet|1 mg^2 mg^2.5 mg^3 mg^4 mg^5 mg^6 mg^7.5 mg^10 mg|Vitamin K antagonist; INR monitoring|High bleeding risk—fall prevention critical|none
apixaban|Apixaban|Eliquis|anticoagulant|AF stroke prevention; VTE|Cancer-associated thrombosis pathways|oral-tablet|2.5 mg^5 mg|Direct oral Xa inhibitor|Bleeding risk; hold per procedure protocols|none
rivaroxaban|Rivaroxaban|Xarelto|anticoagulant|AF, VTE, some CAD/PAD regimens|Higher strengths with food|oral-tablet|2.5 mg^10 mg^15 mg^20 mg|DOAC; renal dosing matters|Bleeding and fall risk|none
dabigatran|Dabigatran|Pradaxa|anticoagulant|AF and VTE|Idarucizumab reversal emergencies|oral-capsule|75 mg^110 mg^150 mg|Direct thrombin inhibitor|Dyspepsia; bleeding risk|none
enoxaparin|Enoxaparin|Lovenox|anticoagulant|VTE prophylaxis/treatment; ACS bridging|Pregnancy VTE specialty|subcutaneous^intravenous|30 mg^40 mg^60 mg^80 mg^100 mg^120 mg^1 mg/kg|LMWH|Injection technique; bleeding risk|none
heparin|Heparin|Hep-Lock|anticoagulant|Inpatient anticoagulation; line flushes|Peri-op bridging specialty|intravenous^subcutaneous|1000 units/mL^5000 units/mL^10000 units/mL|Unfractionated; aPTT/anti-Xa|Hospital dosing typically|none
clopidogrel|Clopidogrel|Plavix|antiplatelet|ACS, stent, secondary stroke prevention|PAD adjunct|oral-tablet|75 mg^300 mg|P2Y12; CYP2C19 variability|Bleeding risk with falls/procedures|none
ticagrelor|Ticagrelor|Brilinta|antiplatelet|ACS dual antiplatelet therapy|Dyspnea common side effect|oral-tablet|60 mg^90 mg|Reversible P2Y12|Bleeding risk|none
prasugrel|Prasugrel|Effient|antiplatelet|ACS with PCI selected patients|Age/weight contraindications|oral-tablet|5 mg^10 mg|Potent P2Y12|Avoid if prior stroke/TIA typically|none
metoprolol-tartrate|Metoprolol tartrate|Lopressor|beta-blocker|HTN, angina, post-MI, rate control|Migraine prophylaxis^Performance anxiety|oral-tablet^intravenous|25 mg^50 mg^100 mg^1 mg/mL IV|Selective beta-1 (tartrate often BID)|Blunts HR—use RPE/Borg|none
metoprolol-succinate|Metoprolol succinate|Toprol-XL|beta-blocker|HF, HTN, angina (ER)|Class off-label uses|oral-tablet|25 mg^50 mg^100 mg^200 mg|Evidence-based HFrEF beta-blocker|HR blunting with exertion|none
atenolol|Atenolol|Tenormin|beta-blocker|Hypertension and angina|Migraine prophylaxis|oral-tablet|25 mg^50 mg^100 mg|Renally cleared beta-blocker|HR blunting|none
carvedilol|Carvedilol|Coreg|beta-blocker|HFrEF, HTN, post-MI LV dysfunction|Alpha + beta blockade|oral-tablet^oral-capsule|3.125 mg^6.25 mg^12.5 mg^25 mg^10 mg CR^20 mg CR^40 mg CR|Nonselective with alpha-1 block|Orthostasis early in titration|none
propranolol|Propranolol|Inderal|beta-blocker|HTN, tremor, migraine prevention, performance anxiety|Thyrotoxicosis symptom control|oral-tablet^oral-capsule^oral-solution^intravenous|10 mg^20 mg^40 mg^60 mg^80 mg^120 mg ER^160 mg ER|Nonselective; avoid in asthma typically|HR blunting; fatigue possible|none
bisoprolol|Bisoprolol|Zebeta|beta-blocker|Hypertension; HFrEF evidence-based|Rate control adjunct|oral-tablet|2.5 mg^5 mg^10 mg|Cardioselective|HR blunting|none
labetalol|Labetalol|Trandate|beta-blocker|Hypertension; pregnancy HTN inpatient|Alpha+beta block|oral-tablet^intravenous|100 mg^200 mg^300 mg^5 mg/mL|Combined blocker|Orthostasis|none
nebivolol|Nebivolol|Bystolic|beta-blocker|Hypertension|NO-mediated vasodilation claims|oral-tablet|2.5 mg^5 mg^10 mg^20 mg|Selective beta-1|HR blunting|none
amlodipine|Amlodipine|Norvasc|calcium-channel-blocker|Hypertension and angina|Raynaud phenomenon|oral-tablet|2.5 mg^5 mg^10 mg|DHP CCB; edema common|Ankle edema may affect gait comfort|none
diltiazem|Diltiazem|Cardizem^Tiazac|calcium-channel-blocker|Rate control AF; angina; HTN|Vasospasm angina|oral-tablet^oral-capsule^intravenous|30 mg^60 mg^120 mg ER^180 mg ER^240 mg ER^300 mg ER|Non-DHP; AV nodal effects|Bradycardia with beta-blockers|none
verapamil|Verapamil|Calan^Verelan|calcium-channel-blocker|Rate control, angina, HTN, cluster headache prevention|SVT acute IV|oral-tablet^oral-capsule^intravenous|40 mg^80 mg^120 mg^180 mg ER^240 mg ER|Non-DHP; constipation common|Avoid some beta-blocker combos|none
nifedipine|Nifedipine|Procardia^Adalat CC|calcium-channel-blocker|HTN; angina; Raynaud|IR not for outpatient hypertensive urgency|oral-capsule^oral-tablet|10 mg IR^20 mg IR^30 mg ER^60 mg ER^90 mg ER|DHP CCB|Edema; reflex tach with IR|none
lisinopril|Lisinopril|Prinivil^Zestril|ace-inhibitor|HTN, HFrEF, post-MI, diabetic kidney protection|Proteinuric CKD pathways|oral-tablet|2.5 mg^5 mg^10 mg^20 mg^30 mg^40 mg|ACEI; cough and hyperkalemia risk|Orthostasis if volume depleted|none
enalapril|Enalapril|Vasotec|ace-inhibitor|HTN and HFrEF|IV enalaprilat inpatient|oral-tablet^intravenous|2.5 mg^5 mg^10 mg^20 mg^1.25 mg IV|ACEI class effects|Renal/K+ monitoring|none
ramipril|Ramipril|Altace|ace-inhibitor|HTN, high CV risk, post-MI|HOPE-trial populations historically|oral-capsule|1.25 mg^2.5 mg^5 mg^10 mg|ACEI|Cough, angioedema rare|none
benazepril|Benazepril|Lotensin|ace-inhibitor|Hypertension|Combo with amlodipine common|oral-tablet|5 mg^10 mg^20 mg^40 mg|ACEI|Cough|none
losartan|Losartan|Cozaar|arb|HTN, diabetic nephropathy, stroke risk reduction in LVH|ACEI cough alternative|oral-tablet|25 mg^50 mg^100 mg|ARB; less cough than ACEI|Hyperkalemia/renal monitoring|none
valsartan|Valsartan|Diovan|arb|HTN, HFrEF, post-MI|Part of ARNI combo separate|oral-tablet|40 mg^80 mg^160 mg^320 mg|ARB with HF indication|Orthostasis possible|none
olmesartan|Olmesartan|Benicar|arb|Hypertension|Sprue-like enteropathy rare|oral-tablet|5 mg^20 mg^40 mg|ARB|Class monitoring|none
irbesartan|Irbesartan|Avapro|arb|HTN; diabetic nephropathy|ARB class|oral-tablet|75 mg^150 mg^300 mg|ARB|Renal/K+|none
candesartan|Candesartan|Atacand|arb|HTN; HFrEF|ARB class|oral-tablet|4 mg^8 mg^16 mg^32 mg|ARB|Same|none
sacubitril-valsartan|Sacubitril/Valsartan|Entresto|arb|HFrEF|Washout from ACEI required|oral-tablet|24/26 mg^49/51 mg^97/103 mg|ARNI|Hypotension, hyperkalemia|none
furosemide|Furosemide|Lasix|diuretic|Edema (HF, CKD); HTN adjunct|Hypercalcemia adjunct rare|oral-tablet^oral-solution^intravenous^intramuscular|20 mg^40 mg^80 mg^10 mg/mL|Loop diuretic; electrolyte loss|Orthostasis, urgency, fall risk|none
hydrochlorothiazide|Hydrochlorothiazide|Microzide|diuretic|Hypertension; mild edema|Nephrolithiasis prevention adjunct|oral-tablet^oral-capsule|12.5 mg^25 mg^50 mg|Thiazide; hyponatremia risk elderly|Orthostasis; sun sensitivity|none
chlorthalidone|Chlorthalidone|Thalitone|diuretic|Hypertension (long-acting thiazide-like)|Often preferred over HCTZ in guidelines|oral-tablet|15 mg^25 mg^50 mg|Potent; electrolyte monitoring|Orthostasis|none
spironolactone|Spironolactone|Aldactone|diuretic|HFrEF, resistant HTN, hyperaldosteronism, ascites|Acne/hirsutism off-label|oral-tablet^oral-suspension|25 mg^50 mg^100 mg|MRA; hyperkalemia risk|Gynecomastia; K+ monitoring|none
torsemide|Torsemide|Demadex|diuretic|Edema and HTN|More predictable oral bioavailability for some|oral-tablet|5 mg^10 mg^20 mg^100 mg|Loop diuretic|Loop precautions|none
bumetanide|Bumetanide|Bumex|diuretic|Edema|Potent loop|oral-tablet^intravenous^intramuscular|0.5 mg^1 mg^2 mg|Loop|Orthostasis|none
eplerenone|Eplerenone|Inspra|diuretic|HFrEF; HTN|More selective MRA|oral-tablet|25 mg^50 mg|MRA|Hyperkalemia|none
atorvastatin|Atorvastatin|Lipitor|statin|Hyperlipidemia; ASCVD prevention|High-intensity option|oral-tablet|10 mg^20 mg^40 mg^80 mg|HMG-CoA reductase inhibitor|Myalgias—differentiate from training soreness|none
rosuvastatin|Rosuvastatin|Crestor|statin|Hyperlipidemia; ASCVD risk reduction|High-intensity|oral-tablet|5 mg^10 mg^20 mg^40 mg|Potent statin|Myalgia counseling|none
simvastatin|Simvastatin|Zocor|statin|Hyperlipidemia|Many drug interactions|oral-tablet|5 mg^10 mg^20 mg^40 mg|Evening dosing traditional|Myopathy with interacting drugs|none
pravastatin|Pravastatin|Pravachol|statin|Hyperlipidemia|Fewer CYP3A4 interactions|oral-tablet|10 mg^20 mg^40 mg^80 mg|Hydrophilic statin|Myalgia still possible|none
lovastatin|Lovastatin|Mevacor|statin|Hyperlipidemia|With evening meal traditional|oral-tablet|10 mg^20 mg^40 mg|Statin|Myalgia|none
pitavastatin|Pitavastatin|Livalo|statin|Hyperlipidemia|Fewer interactions some patients|oral-tablet|1 mg^2 mg^4 mg|Statin|Myalgia|none
ezetimibe|Ezetimibe|Zetia|lipid-modifying|LDL lowering adjunct to statin|Sitosterolemia specialty|oral-tablet|10 mg|NPC1L1 inhibitor|Well tolerated generally|none
fenofibrate|Fenofibrate|Tricor^Antara|lipid-modifying|Hypertriglyceridemia|Multiple salt forms|oral-tablet^oral-capsule|48 mg^145 mg^54 mg^160 mg|Fibrate|Renal dosing|none
gemfibrozil|Gemfibrozil|Lopid|lipid-modifying|Hypertriglyceridemia|Avoid with some statins|oral-tablet|600 mg|Fibrate|Myopathy risk with statin|none
icosapent-ethyl|Icosapent ethyl|Vascepa|lipid-modifying|CV risk reduction with high TG|Purified EPA|oral-capsule|0.5 g^1 g|Omega-3 prescription|AF signal|none
amiodarone|Amiodarone|Pacerone^Cordarone|antiarrhythmic|Atrial and ventricular arrhythmias|Many toxicities—specialist oversight|oral-tablet^intravenous|100 mg^200 mg^400 mg^50 mg/mL IV|Class III; thyroid/liver/lung monitoring|Photosensitivity; long half-life|none
digoxin|Digoxin|Lanoxin|antiarrhythmic|Rate control AF; HFrEF symptom adjunct|Narrow therapeutic index|oral-tablet^oral-solution^intravenous|0.0625 mg^0.125 mg^0.25 mg|Na/K ATPase inhibitor|Toxicity if dehydration/renal decline|none
sotalol|Sotalol|Betapace|antiarrhythmic|Ventricular arrhythmias; AF rhythm|QT monitoring required|oral-tablet^intravenous|80 mg^120 mg^160 mg|Class III + beta block|Hospital initiation often|none
flecainide|Flecainide|Tambocor|antiarrhythmic|SVT/AF selected patients|CAST warning structural heart disease|oral-tablet|50 mg^100 mg^150 mg|Class Ic|Specialist use|none
isosorbide-mononitrate|Isosorbide mononitrate|Imdur|antianginal|Chronic angina prevention|Need nitrate-free interval|oral-tablet|30 mg^60 mg^120 mg|Nitrate; headache common|Avoid PDE5 inhibitors|none
nitroglycerin|Nitroglycerin|Nitrostat^Nitro-Dur|antianginal|Acute angina; IV hypertensive emergencies|Anal fissure topical specialty|sublingual^transdermal^intravenous^oral-capsule^topical-ointment|0.3 mg SL^0.4 mg SL^0.6 mg SL^0.1 mg/h patch^0.2 mg/h^0.4 mg/h|Rapid venodilation|Sit when using SL; fall if hypotensive|none
ranolazine|Ranolazine|Ranexa|antianginal|Chronic angina|QT and drug interactions|oral-tablet|500 mg^1000 mg|Late Na current inhibitor|Dizziness possible|none
hydralazine|Hydralazine|Apresoline|antihypertensive|HTN; HF combo with nitrate selected patients|Preeclampsia inpatient|oral-tablet^intravenous^intramuscular|10 mg^25 mg^50 mg^100 mg^20 mg/mL|Arterial vasodilator|Reflex tachycardia|none
clonidine|Clonidine|Catapres^Kapvay|antihypertensive|HTN; ADHD ER; withdrawal adjuncts|Hot flashes^Spasticity|oral-tablet^transdermal^epidural|0.1 mg^0.2 mg^0.3 mg^0.1 mg/24h patch|Central alpha-2 agonist|Rebound HTN if stopped abruptly|none
metformin|Metformin|Glucophage^Glumetza|antidiabetic|Type 2 diabetes first-line|Prediabetes^PCOS|oral-tablet^oral-solution|500 mg^850 mg^1000 mg^500 mg ER^1000 mg ER|Improves insulin sensitivity; GI effects|Lactic acidosis risk if severe illness/AKI|none
glipizide|Glipizide|Glucotrol|antidiabetic|Type 2 diabetes (sulfonylurea)|Hypoglycemia risk|oral-tablet|2.5 mg^5 mg^10 mg^2.5 mg XL^5 mg XL^10 mg XL|Stimulates insulin release|Hypoglycemia with exercise timing|none
glimepiride|Glimepiride|Amaryl|antidiabetic|Type 2 diabetes|SU hypo risk|oral-tablet|1 mg^2 mg^4 mg|Sulfonylurea|Hypoglycemia|none
sitagliptin|Sitagliptin|Januvia|antidiabetic|Type 2 diabetes (DPP-4)|Combination products common|oral-tablet|25 mg^50 mg^100 mg|Weight neutral; rare pancreatitis signal|Low hypo risk alone|none
linagliptin|Linagliptin|Tradjenta|antidiabetic|Type 2 diabetes|Often no renal dose adjust|oral-tablet|5 mg|DPP-4|Well tolerated|none
empagliflozin|Empagliflozin|Jardiance|antidiabetic|T2D; HFrEF; CKD risk reduction|Euglycemic DKA rare|oral-tablet|10 mg^25 mg|SGLT2 inhibitor; GU infection risk|Hydration; sick-day rules|none
dapagliflozin|Dapagliflozin|Farxiga|antidiabetic|T2D, HF, CKD indications|SGLT2 class|oral-tablet|5 mg^10 mg|SGLT2i|Genital hygiene counseling|none
canagliflozin|Canagliflozin|Invokana|antidiabetic|T2D; CV/renal indications|Foot care if neuropathy|oral-tablet|100 mg^300 mg|SGLT2i|Foot care education|none
semaglutide|Semaglutide|Ozempic^Rybelsus^Wegovy|antidiabetic|T2D; weight management (Wegovy)|Obesity cardiometabolic risk|subcutaneous^oral-tablet|0.25 mg^0.5 mg^1 mg^2 mg^3 mg oral^7 mg^14 mg^0.25–2.4 mg Wegovy|GLP-1 RA; GI side effects|GI timing around sessions; hydration|none
liraglutide|Liraglutide|Victoza^Saxenda|antidiabetic|T2D (Victoza); weight (Saxenda)|CV benefit in T2D|subcutaneous|0.6 mg^1.2 mg^1.8 mg^0.6–3 mg Saxenda|GLP-1 daily injection|Nausea common early|none
dulaglutide|Dulaglutide|Trulicity|antidiabetic|Type 2 diabetes weekly GLP-1|CV risk reduction|subcutaneous|0.75 mg^1.5 mg^3 mg^4.5 mg|Weekly GLP-1|Injection technique education|none
tirzepatide|Tirzepatide|Mounjaro^Zepbound|antidiabetic|T2D (Mounjaro); weight (Zepbound)|Dual GIP/GLP-1|subcutaneous|2.5 mg^5 mg^7.5 mg^10 mg^12.5 mg^15 mg|Incretin dual agonist|GI titration|none
pioglitazone|Pioglitazone|Actos|antidiabetic|Type 2 diabetes|NASH research contexts|oral-tablet|15 mg^30 mg^45 mg|TZD; fluid retention/HF caution|Edema; fracture risk long-term|none
insulin-glargine|Insulin glargine|Lantus^Basaglar^Toujeo|insulin|Basal insulin for diabetes|Hospital protocols vary products|subcutaneous|100 units/mL^300 units/mL Toujeo|Long-acting basal|Hypoglycemia with activity changes|none
insulin-lispro|Insulin lispro|Humalog^Admelog|insulin|Prandial/rapid insulin|Pumps and pens|subcutaneous^intravenous|100 units/mL^200 units/mL|Rapid-acting|Carb timing with exercise|none
insulin-aspart|Insulin aspart|Novolog^Fiasp|insulin|Prandial insulin|Fiasp ultra-rapid|subcutaneous^intravenous|100 units/mL|Rapid-acting|Hypo risk|none
insulin-detemir|Insulin detemir|Levemir|insulin|Basal insulin|Sometimes BID|subcutaneous|100 units/mL|Long-acting|Basal precautions|none
insulin-degludec|Insulin degludec|Tresiba|insulin|Ultra-long basal insulin|Flexible timing some patients|subcutaneous|100 units/mL^200 units/mL|Basal|Hypoglycemia|none
insulin-regular|Regular insulin|Humulin R^Novolin R|insulin|Prandial/sliding scale; IV drips|U-500 specialty|subcutaneous^intravenous|100 units/mL^500 units/mL|Short-acting|IV hospital use common|none
insulin-nph|Insulin NPH|Humulin N^Novolin N|insulin|Intermediate basal insulin|Less costly basal option|subcutaneous|100 units/mL|Cloudy; roll gently|Peak hypo risk midday|none
albuterol|Albuterol|ProAir^Ventolin^Proventil|respiratory|Acute bronchospasm relief|Hyperkalemia adjunct rare inpatient|inhalation^nebulized^oral-tablet^oral-solution|90 mcg/puff^2.5 mg neb^0.63 mg neb^2 mg oral^4 mg oral|SABA rescue|Tachycardia/tremor; spacer technique|none
levalbuterol|Levalbuterol|Xopenex|respiratory|Bronchospasm|R-enantiomer of albuterol|inhalation^nebulized|45 mcg/puff^0.31 mg^0.63 mg^1.25 mg neb|SABA|Rescue role|none
fluticasone-propionate|Fluticasone propionate|Flovent^Flonase|respiratory|Asthma controller ICS; allergic rhinitis nasal|Eosinophilic specialty|inhalation^nasal^topical-cream|44 mcg^110 mcg^220 mcg^50 mcg nasal^0.05% cream|Inhaled/intranasal corticosteroid|Rinse mouth after inhaled use|none
budesonide|Budesonide|Pulmicort^Rhinocort^Entocort|respiratory|Asthma ICS; rhinitis; ileal Crohn oral|EoE specialty|inhalation^nebulized^nasal^oral-capsule|90 mcg^180 mcg^0.25 mg neb^0.5 mg neb^3 mg oral|ICS / GI steroid forms differ|Oral thrush prevention for inhaled|none
budesonide-formoterol|Budesonide/Formoterol|Symbicort|respiratory|Asthma and COPD maintenance|SMART therapy some guidelines|inhalation|80/4.5 mcg^160/4.5 mcg|ICS/LABA|Not pure rescue unless protocol says|none
fluticasone-salmeterol|Fluticasone/Salmeterol|Advair^Wixela|respiratory|Asthma and COPD maintenance|Diskus vs HFA devices|inhalation|100/50^250/50^500/50 mcg Diskus^45/21 HFA|ICS/LABA|Device teaching critical|none
tiotropium|Tiotropium|Spiriva|respiratory|COPD maintenance; asthma Respimat|Long-acting anticholinergic|inhalation|18 mcg HandiHaler^1.25 mcg^2.5 mcg Respimat|LAMA|Dry mouth; technique|none
montelukast|Montelukast|Singulair|respiratory|Asthma maintenance; allergic rhinitis|Exercise-induced bronchoconstriction|oral-tablet^oral-chewable^oral-granules|4 mg^5 mg^10 mg|Leukotriene receptor antagonist|Neuropsychiatric warning—monitor mood|none
ipratropium|Ipratropium|Atrovent|respiratory|COPD; acute asthma neb adjunct|Rhinitis nasal spray|inhalation^nebulized^nasal|17 mcg/puff^0.5 mg neb^0.03% nasal|SAMA|Glaucoma caution with neb mist|none
gabapentin|Gabapentin|Neurontin^Gralise^Horizant|neuropathic-agent|Postherpetic neuralgia; adjunct seizures|Neuropathic pain^RLS^Anxiety^AUD off-label|oral-tablet^oral-capsule^oral-solution|100 mg^300 mg^400 mg^600 mg^800 mg|Calcium channel α2δ ligand|Sedation, dizziness, fall risk; renal dosing|none
pregabalin|Pregabalin|Lyrica|neuropathic-agent|Diabetic neuropathy, PHN, fibromyalgia, SCI pain|GAD in some regions|oral-capsule^oral-solution^oral-tablet|25 mg^50 mg^75 mg^100 mg^150 mg^200 mg^225 mg^300 mg|Schedule V in US|Edema, sedation, fall risk|V
duloxetine|Duloxetine|Cymbalta^Drizalma|antidepressant|Depression, GAD, diabetic neuropathy, fibromyalgia, chronic MSK pain|Stress incontinence off-label|oral-capsule|20 mg^30 mg^40 mg^60 mg|SNRI; avoid abrupt stop|May help chronic pain plans; nausea early|none
amitriptyline|Amitriptyline|Elavil|antidepressant|Depression; chronic pain and migraine prevention off-label|Tension headache^Neuropathic pain low dose|oral-tablet|10 mg^25 mg^50 mg^75 mg^100 mg^150 mg|TCA; anticholinergic and conduction|Hangover/fall risk; dry mouth|none
nortriptyline|Nortriptyline|Pamelor|antidepressant|Depression; neuropathic pain/migraine off-label|Better tolerated TCA for some|oral-capsule^oral-solution|10 mg^25 mg^50 mg^75 mg|TCA|Lower anticholinergic than amitriptyline|none
venlafaxine|Venlafaxine|Effexor XR|antidepressant|Depression, anxiety disorders|Neuropathic pain off-label|oral-tablet^oral-capsule|37.5 mg^75 mg^150 mg^225 mg|SNRI; BP monitoring|Discontinuation if missed|none
sertraline|Sertraline|Zoloft|antidepressant|Depression, anxiety, PTSD, OCD, panic|PMDD|oral-tablet^oral-solution|25 mg^50 mg^100 mg^150 mg^200 mg|SSRI|Activation or sedation; GI early|none
escitalopram|Escitalopram|Lexapro|antidepressant|Depression and GAD|Well-tolerated SSRI option|oral-tablet^oral-solution|5 mg^10 mg^20 mg|SSRI|QT caution high dose|none
fluoxetine|Fluoxetine|Prozac^Sarafem|antidepressant|Depression, OCD, bulimia, panic|PMDD; bipolar depression combos specialty|oral-tablet^oral-capsule^oral-solution|10 mg^20 mg^40 mg^60 mg^90 mg weekly|Long half-life SSRI|CYP2D6 interactions|none
citalopram|Citalopram|Celexa|antidepressant|Depression|QT max dose limits|oral-tablet^oral-solution|10 mg^20 mg^40 mg|SSRI|Dose cap older adults|none
paroxetine|Paroxetine|Paxil|antidepressant|Depression, anxiety disorders|Menopausal hot flashes (Brisdelle)|oral-tablet^oral-suspension|10 mg^20 mg^30 mg^40 mg^12.5 mg CR^25 mg CR|SSRI; more anticholinergic|Higher discontinuation risk|none
bupropion|Bupropion|Wellbutrin^Zyban|antidepressant|Depression; smoking cessation|ADHD off-label|oral-tablet|75 mg^100 mg^150 mg SR^150 mg XL^300 mg XL|NDRI; seizure risk if predisposed|May be activating|none
mirtazapine|Mirtazapine|Remeron|antidepressant|Depression; appetite/sleep off-label common|PTSD adjunct|oral-tablet^oral-disintegrating|7.5 mg^15 mg^30 mg^45 mg|NaSSA; sedation at lower doses|Weight gain, morning hangover|none
trazodone|Trazodone|Desyrel|antidepressant|Depression; insomnia off-label common|Priapism rare|oral-tablet|50 mg^100 mg^150 mg^300 mg|SARI|Morning sedation/fall risk|none
desvenlafaxine|Desvenlafaxine|Pristiq|antidepressant|Depression|SNRI|oral-tablet|25 mg^50 mg^100 mg|SNRI|Discontinuation symptoms|none
topiramate|Topiramate|Topamax^Trokendi XR|anticonvulsant|Seizures; migraine prevention|Weight loss adjunct^AUD research|oral-tablet^oral-capsule|25 mg^50 mg^100 mg^200 mg^25 mg sprinkle|Cognitive fog; carbonic anhydrase effects|Cognitive slowing may affect motor learning|none
lamotrigine|Lamotrigine|Lamictal|anticonvulsant|Seizures; bipolar maintenance|Slow titration for rash risk|oral-tablet^oral-disintegrating^oral-chewable|25 mg^50 mg^100 mg^200 mg^5 mg chew^25 mg ODT|SJS/TEN risk if titrated too fast|Rash emergency education|none
levetiracetam|Levetiracetam|Keppra|anticonvulsant|Seizures|Mood/irritability side effects|oral-tablet^oral-solution^intravenous|250 mg^500 mg^750 mg^1000 mg^100 mg/mL|SV2A modulator|Behavioral changes possible|none
carbamazepine|Carbamazepine|Tegretol^Carbatrol|anticonvulsant|Seizures; trigeminal neuralgia|Bipolar specialty|oral-tablet^oral-capsule^oral-suspension|100 mg^200 mg^300 mg ER^400 mg ER|HLA-B*1502 risk some ancestries|Many drug interactions|none
valproate|Divalproex / Valproate|Depakote^Depakene|anticonvulsant|Seizures; bipolar mania; migraine prevention|Teratogenicity boxed warning|oral-tablet^oral-capsule^oral-sprinkle^intravenous|125 mg^250 mg^500 mg^250 mg/5 mL|Weight gain, tremor, liver/pancreas risk|Tremor may affect fine motor|none
oxcarbazepine|Oxcarbazepine|Trileptal|anticonvulsant|Seizures|Hyponatremia risk|oral-tablet^oral-suspension|150 mg^300 mg^600 mg|Na channel|Sodium monitoring|none
lacosamide|Lacosamide|Vimpat|anticonvulsant|Seizures|PR prolongation|oral-tablet^oral-solution^intravenous|50 mg^100 mg^150 mg^200 mg|Schedule V|Dizziness ataxia|V
phenytoin|Phenytoin|Dilantin|anticonvulsant|Seizures|Nonlinear kinetics|oral-capsule^oral-chewable^oral-suspension^intravenous|30 mg^100 mg^50 mg chew^125 mg/5 mL|Many interactions|Gingival hyperplasia, ataxia|none
sumatriptan|Sumatriptan|Imitrex|migraine|Acute migraine|Cluster headache SC contexts|oral-tablet^subcutaneous^nasal^transdermal|25 mg^50 mg^100 mg^4 mg SC^6 mg SC^5 mg nasal^20 mg nasal|5-HT1B/1D agonist; vascular cautions|Treat early; med-overuse headache risk|none
rizatriptan|Rizatriptan|Maxalt|migraine|Acute migraine|ODT if nausea|oral-tablet^oral-disintegrating|5 mg^10 mg|Triptan class|Vascular cautions|none
eletriptan|Eletriptan|Relpax|migraine|Acute migraine|CYP3A4 interactions|oral-tablet|20 mg^40 mg|Triptan|Class limits|none
botulinum-toxin-a|OnabotulinumtoxinA|Botox|neuromuscular|Chronic migraine; spasticity; dystonia; cosmetics|Hyperhidrosis, bladder specialty|intramuscular|50 unit vial^100 unit vial^200 unit vial|Specialist injection only|Temporary weakness in injected muscles|none
zolpidem|Zolpidem|Ambien^Edluar|sedative-hypnotic|Insomnia (sleep onset)|Complex sleep behaviors warning|oral-tablet^oral-spray^sublingual|5 mg^10 mg^6.25 mg CR^12.5 mg CR|Non-benzo hypnotic|Fall risk if nocturnal ambulation|IV
eszopiclone|Eszopiclone|Lunesta|sedative-hypnotic|Insomnia|Metallic taste common|oral-tablet|1 mg^2 mg^3 mg|Non-benzo hypnotic|Next-day impairment possible|IV
hydroxyzine|Hydroxyzine|Vistaril^Atarax|antihistamine|Anxiety; pruritus; peri-op sedation|Nausea adjunct|oral-tablet^oral-capsule^oral-solution^intramuscular|10 mg^25 mg^50 mg^100 mg^25 mg/mL IM|First-gen antihistamine|Anticholinergic sedation/fall risk|none
buspirone|Buspirone|BuSpar|anxiolytic|Generalized anxiety|Delayed onset weeks|oral-tablet|5 mg^7.5 mg^10 mg^15 mg^30 mg|5-HT1A partial agonist|Less sedating than benzos|none
quetiapine|Quetiapine|Seroquel|antipsychotic|Schizophrenia, bipolar; depression adjunct|Insomnia off-label not first-line|oral-tablet|25 mg^50 mg^100 mg^200 mg^300 mg^400 mg^50 mg XR^150 mg XR^200 mg XR|Metabolic and QT risks|Sedation/orthostasis|none
olanzapine|Olanzapine|Zyprexa|antipsychotic|Schizophrenia, bipolar|Chemotherapy nausea specialty|oral-tablet^oral-disintegrating^intramuscular|2.5 mg^5 mg^7.5 mg^10 mg^15 mg^20 mg|Metabolic syndrome risk high|Sedation, weight gain|none
aripiprazole|Aripiprazole|Abilify|antipsychotic|Schizophrenia, bipolar, depression adjunct, Tourette, ASD irritability|Impulse control warnings|oral-tablet^oral-solution^oral-disintegrating^intramuscular|2 mg^5 mg^10 mg^15 mg^20 mg^30 mg^300 mg LAI^400 mg LAI|Partial D2 agonist|Akathisia may affect exercise comfort|none
risperidone|Risperidone|Risperdal|antipsychotic|Schizophrenia, bipolar, ASD irritability|LAI available|oral-tablet^oral-solution^oral-disintegrating^intramuscular|0.25 mg^0.5 mg^1 mg^2 mg^3 mg^4 mg|Prolactin elevation|EPS risk dose-related|none
haloperidol|Haloperidol|Haldol|antipsychotic|Schizophrenia; acute agitation; Tourette|QT and EPS risk|oral-tablet^oral-solution^intramuscular^intravenous|0.5 mg^1 mg^2 mg^5 mg^10 mg^20 mg^5 mg/mL|High-potency FGA|EPS, QT|none
clozapine|Clozapine|Clozaril|antipsychotic|Treatment-resistant schizophrenia|REMS ANC monitoring|oral-tablet^oral-suspension^oral-disintegrating|12.5 mg^25 mg^50 mg^100 mg^200 mg|Most effective; agranulocytosis risk|Orthostasis, sialorrhea|none
lithium|Lithium carbonate|Lithobid^Eskalith|mood-stabilizer|Bipolar disorder|Narrow therapeutic index|oral-tablet^oral-capsule^oral-solution|150 mg^300 mg^450 mg ER^600 mg|Renal/thyroid monitoring|Hydration critical with exercise/heat|none
methylphenidate|Methylphenidate|Ritalin^Concerta^Daytrana|stimulant|ADHD; narcolepsy|Cancer-related fatigue off-label|oral-tablet^oral-capsule^transdermal^oral-solution|5 mg^10 mg^20 mg^18 mg ER^27 mg ER^36 mg ER^54 mg ER^10 mg patch|Schedule II stimulant|Appetite/HR effects|II
amphetamine-salts|Amphetamine salts|Adderall^Mydayis|stimulant|ADHD; narcolepsy|Class stimulant cautions|oral-tablet^oral-capsule|5 mg^10 mg^15 mg^20 mg^30 mg^5 mg XR^10 mg XR^20 mg XR^30 mg XR|Schedule II|CV screening; appetite|II
lisdexamfetamine|Lisdexamfetamine|Vyvanse|stimulant|ADHD; binge eating disorder|Prodrug design|oral-capsule^oral-chewable|10 mg^20 mg^30 mg^40 mg^50 mg^60 mg^70 mg|Schedule II|Stimulant class cautions|II
atomoxetine|Atomoxetine|Strattera|adhd-nonstimulant|ADHD|Not controlled|oral-capsule|10 mg^18 mg^25 mg^40 mg^60 mg^80 mg^100 mg|NRI; liver/suicidality warnings|Slower onset than stimulants|none
modafinil|Modafinil|Provigil|wakefulness|Narcolepsy, SWSD, OSA residual sleepiness|Off-label fatigue/ADHD|oral-tablet|100 mg^200 mg|Schedule IV|Headache, insomnia possible|IV
omeprazole|Omeprazole|Prilosec|gi-acid|GERD, ulcers, H. pylori regimens|Stress ulcer prophylaxis inpatient|oral-capsule^oral-tablet^oral-packet|10 mg^20 mg^40 mg|PPI; long-term B12/Mg/fracture discussions|Take before meals typically|none
pantoprazole|Pantoprazole|Protonix|gi-acid|GERD and erosive esophagitis|IV form common inpatient|oral-tablet^intravenous^oral-packet|20 mg^40 mg^40 mg IV|PPI|Long-term class considerations|none
esomeprazole|Esomeprazole|Nexium|gi-acid|GERD, ulcers|H. pylori combos|oral-capsule^oral-packet^intravenous|20 mg^40 mg|PPI|Same PPI class|none
famotidine|Famotidine|Pepcid|gi-acid|GERD, heartburn, ulcer|Less CYP interaction than cimetidine|oral-tablet^oral-suspension^intravenous|10 mg^20 mg^40 mg^10 mg/mL IV|H2 blocker|Renal dosing in CKD|none
ondansetron|Ondansetron|Zofran|antiemetic|Nausea/vomiting (chemo, post-op, gastroenteritis)|Pregnancy nausea specialty guidance varies|oral-tablet^oral-disintegrating^oral-solution^intravenous^intramuscular|4 mg^8 mg^4 mg ODT^4 mg/2 mL IV|5-HT3 antagonist; QT caution|Constipation possible|none
metoclopramide|Metoclopramide|Reglan|antiemetic|Gastroparesis; reflux; chemo nausea|Tardive dyskinesia boxed warning|oral-tablet^oral-solution^intravenous^intramuscular^nasal|5 mg^10 mg^5 mg/mL|Prokinetic/dopamine antagonist|EPS risk; limit duration|none
promethazine|Promethazine|Phenergan|antiemetic|Nausea, motion sickness, allergy|Not preferred IV (tissue injury)|oral-tablet^oral-solution^rectal^intramuscular^intravenous|12.5 mg^25 mg^50 mg^25 mg/mL|Phenothiazine antihistamine|Marked sedation/fall risk|none
docusate|Docusate sodium|Colace|gi-bowel|Stool softener|Opioid bowel regimens|oral-capsule^oral-tablet^oral-solution^rectal|50 mg^100 mg^250 mg|Surfactant stool softener|Pair with stimulant if opioid constipation|none
senna|Senna|Senokot|gi-bowel|Constipation stimulant laxative|Opioid-induced constipation regimens|oral-tablet^oral-syrup|8.6 mg^15 mg^17.2 mg|Stimulant laxative|Cramping possible|none
polyethylene-glycol|Polyethylene glycol 3350|MiraLAX|gi-bowel|Constipation osmotic laxative|Bowel prep higher volume products|oral-powder|17 g dose|Osmotic|Hydration important|none
loperamide|Loperamide|Imodium|gi-bowel|Acute diarrhea|High-dose abuse cardiac risk|oral-tablet^oral-capsule^oral-solution|2 mg|Peripheral opioid agonist|Do not exceed labeled OTC max|none
amoxicillin|Amoxicillin|Amoxil|antibiotic|Bacterial infections (ear, sinus, strep, dental)|H. pylori combo|oral-capsule^oral-tablet^oral-suspension^oral-chewable|250 mg^500 mg^875 mg^125 mg/5 mL^250 mg/5 mL|Beta-lactam|Finish course; allergy history|none
amoxicillin-clavulanate|Amoxicillin/Clavulanate|Augmentin|antibiotic|Broader sinus/ear/skin/respiratory infections|Bite wounds common|oral-tablet^oral-suspension^oral-chewable|250/125^500/125^875/125 mg^200/28.5 mg/5 mL|Beta-lactam + inhibitor; diarrhea common|Take with food|none
azithromycin|Azithromycin|Zithromax^Z-Pak|antibiotic|Respiratory, STI, MAC prophylaxis specialty|QT prolongation caution|oral-tablet^oral-suspension^intravenous^ophthalmic|250 mg^500 mg^1 g sachet^500 mg IV|Macrolide|GI upset common|none
doxycycline|Doxycycline|Vibramycin^Doryx|antibiotic|Respiratory, skin, tick-borne, acne, malaria prophylaxis|MRSA skin options|oral-tablet^oral-capsule^oral-suspension^intravenous|50 mg^75 mg^100 mg^150 mg|Tetracycline; photosensitivity|Esophagitis—full glass water upright|none
ciprofloxacin|Ciprofloxacin|Cipro|antibiotic|UTI, some GI/bone infections|Tendinopathy/rupture boxed warning|oral-tablet^oral-suspension^intravenous^ophthalmic^otic|250 mg^500 mg^750 mg^200 mg IV^400 mg IV|Fluoroquinolone|Tendon risk—modify loading activities|none
levofloxacin|Levofloxacin|Levaquin|antibiotic|Respiratory, UTI, skin|Same FQ warnings|oral-tablet^oral-solution^intravenous|250 mg^500 mg^750 mg|Fluoroquinolone|Tendon risk with loading|none
sulfamethoxazole-trimethoprim|SMX/TMP|Bactrim^Septra|antibiotic|UTI, MRSA skin, PCP prophylaxis|Hyperkalemia with ACEI/ARB|oral-tablet^oral-suspension^intravenous|400/80 mg SS^800/160 mg DS|Sulfa combination|Sun sensitivity; allergy common|none
cephalexin|Cephalexin|Keflex|antibiotic|Skin, UTI, respiratory streptococcal|Surgical prophylaxis oral sometimes|oral-capsule^oral-tablet^oral-suspension|250 mg^500 mg^750 mg^125 mg/5 mL|First-gen cephalosporin|PCN allergy cross-reactivity considerations|none
ceftriaxone|Ceftriaxone|Rocephin|antibiotic|Serious infections; gonorrhea; meningitis|IM/IV only|intramuscular^intravenous|250 mg^500 mg^1 g^2 g|Third-gen cephalosporin|Clinic/hospital administration|none
metronidazole|Metronidazole|Flagyl|antibiotic|Anaerobic and protozoal infections|C. diff adjunct historically|oral-tablet^oral-capsule^intravenous^topical-gel^vaginal|250 mg^500 mg^750 mg^5 mg/mL IV^0.75% gel|Disulfiram-like with alcohol|Avoid alcohol during/after course|none
nitrofurantoin|Nitrofurantoin|Macrobid^Macrodantin|antibiotic|Lower UTI|Avoid if poor renal function|oral-capsule|25 mg^50 mg^100 mg Macrobid|Urinary antiseptic antibiotic|Take with food|none
clindamycin|Clindamycin|Cleocin|antibiotic|Skin/soft tissue, dental, anaerobic|C. diff risk notable|oral-capsule^oral-solution^intravenous^intramuscular^topical-gel^topical-solution|150 mg^300 mg^75 mg/5 mL^600 mg IV^1% gel|Lincosamide|Diarrhea warning|none
oseltamivir|Oseltamivir|Tamiflu|antiviral|Influenza treatment/prevention|Start early ideally|oral-capsule^oral-suspension|30 mg^45 mg^75 mg|Neuraminidase inhibitor|GI side effects|none
valacyclovir|Valacyclovir|Valtrex|antiviral|HSV and VZV infections|Suppressive therapy regimens|oral-tablet|500 mg^1 g|Prodrug of acyclovir|Hydration for high doses|none
acyclovir|Acyclovir|Zovirax|antiviral|HSV/VZV|IV for severe disease|oral-tablet^oral-capsule^oral-suspension^intravenous^topical-cream|200 mg^400 mg^800 mg^5% cream|Nucleoside analog|Renal dosing critical IV|none
nirmatrelvir-ritonavir|Nirmatrelvir/Ritonavir|Paxlovid|antiviral|High-risk COVID-19 outpatient treatment|Major drug–drug interactions|oral-tablet|150/100 mg dose pack|Protease inhibitor combo|Interaction check mandatory|none
levothyroxine|Levothyroxine|Synthroid^Levoxyl^Tirosint|thyroid|Hypothyroidism|TSH suppression thyroid cancer specialty|oral-tablet^oral-capsule^intravenous|25 mcg^50 mcg^75 mcg^88 mcg^100 mcg^112 mcg^125 mcg^137 mcg^150 mcg^175 mcg^200 mcg|Empty stomach; binders interact|Consistent morning timing|none
liothyronine|Liothyronine|Cytomel|thyroid|Hypothyroidism adjunct/specialty|T3; cardiac caution|oral-tablet|5 mcg^25 mcg^50 mcg|More potent rapid thyroid hormone|Palpitations possible|none
methimazole|Methimazole|Tapazole|thyroid|Hyperthyroidism|Agranulocytosis rare warning|oral-tablet|5 mg^10 mg|Thionamide|Infection symptom education|none
alendronate|Alendronate|Fosamax|osteoporosis|Osteoporosis treatment/prevention|Upright 30 min after dose|oral-tablet^oral-solution|5 mg^10 mg^35 mg^70 mg|Bisphosphonate; atypical fracture/ONJ rare|Avoid high-impact if unexplained thigh/jaw pain|none
risedronate|Risedronate|Actonel^Atelvia|osteoporosis|Osteoporosis|Delayed-release food rules differ|oral-tablet|5 mg^35 mg^150 mg|Bisphosphonate|Class admin rules|none
zoledronic-acid|Zoledronic acid|Reclast^Zometa|osteoporosis|Osteoporosis yearly IV; oncology bone mets|Flu-like post-infusion common|intravenous|5 mg Reclast^4 mg Zometa|IV bisphosphonate|Post-infusion myalgias may limit sessions|none
denosumab|Denosumab|Prolia^Xgeva|osteoporosis|Osteoporosis (Prolia); oncology bone (Xgeva)|Rebound fracture if delayed doses|subcutaneous|60 mg Prolia^120 mg Xgeva|RANKL inhibitor|Dental health before start|none
teriparatide|Teriparatide|Forteo|osteoporosis|Severe osteoporosis anabolic therapy|Lifetime limit; specialist|subcutaneous|20 mcg daily pen|PTH analog|Injection site rotation|none
allopurinol|Allopurinol|Zyloprim|gout|Gout prevention; tumor lysis prevention|HLA-B*5801 risk some ancestries|oral-tablet^intravenous|100 mg^300 mg|XO inhibitor|Do not start during acute flare without cover|none
colchicine|Colchicine|Colcrys^Mitigare|gout|Acute gout; FMF|Pericarditis adjunct specialty|oral-tablet^oral-capsule^oral-solution|0.6 mg|Narrow therapeutic index|GI toxicity first overdose sign|none
febuxostat|Febuxostat|Uloric|gout|Chronic gout if allopurinol fails/intolerant|CV risk warning|oral-tablet|40 mg^80 mg|XO inhibitor|Flare prophylaxis concepts|none
methotrexate|Methotrexate|Trexall^Otrexup^Rasuvo|dmard|RA, psoriasis; oncology different dosing|Weekly rheum vs daily oncology—critical|oral-tablet^subcutaneous^intramuscular^intravenous|2.5 mg^5 mg^7.5 mg^10 mg^15 mg^20 mg^25 mg|Antifolate; folate common in rheum|Weekly dosing verification essential|none
hydroxychloroquine|Hydroxychloroquine|Plaquenil|dmard|SLE, RA|Retinal toxicity monitoring|oral-tablet|100 mg^200 mg^300 mg^400 mg|Antimalarial immunomodulator|Eye exams periodic|none
sulfasalazine|Sulfasalazine|Azulfidine|dmard|RA, ulcerative colitis|Sulfonamide allergy caution|oral-tablet|500 mg^500 mg EC|Yellow-orange body fluid discoloration|Sun sensitivity|none
adalimumab|Adalimumab|Humira^Amjevita|biologic|RA, PsA, AS, IBD, psoriasis, HS|Infection/TB screening required|subcutaneous|40 mg pen^40 mg syringe^80 mg|TNF inhibitor|Hold around serious infection|none
etanercept|Etanercept|Enbrel|biologic|RA, PsA, AS, psoriasis|TB screening|subcutaneous|25 mg^50 mg|TNF receptor fusion|Injection site reactions|none
infliximab|Infliximab|Remicade^Inflectra|biologic|IBD, RA, PsA, AS, psoriasis|Infusion reactions|intravenous|100 mg vial weight-based|TNF inhibitor infusion|Infusion day fatigue possible|none
tofacitinib|Tofacitinib|Xeljanz|dmard|RA, PsA, UC, AS|JAK inhibitor boxed warnings|oral-tablet^oral-solution|5 mg^10 mg^11 mg XR|JAK inhibitor|Infection and CV risk discussions|none
apremilast|Apremilast|Otezla|dmard|Psoriasis, PsA, Behçet oral ulcers|GI titration pack|oral-tablet|10 mg^20 mg^30 mg|PDE4 inhibitor|Weight loss, diarrhea early|none
cetirizine|Cetirizine|Zyrtec|antihistamine|Allergic rhinitis and urticaria|Less sedating second generation|oral-tablet^oral-capsule^oral-solution^oral-chewable|5 mg^10 mg|Second-gen H1 blocker|Still mild sedation in some|none
loratadine|Loratadine|Claritin|antihistamine|Allergic rhinitis and urticaria|Generally non-sedating|oral-tablet^oral-solution^oral-chewable|5 mg^10 mg|Second-gen H1|Well tolerated|none
fexofenadine|Fexofenadine|Allegra|antihistamine|Allergic rhinitis and urticaria|Avoid fruit juice reducing absorption|oral-tablet^oral-suspension|30 mg^60 mg^180 mg|Second-gen H1|Least sedating of class for many|none
diphenhydramine|Diphenhydramine|Benadryl|antihistamine|Allergic reactions; insomnia OTC; motion sickness|Beers criteria avoid in elderly|oral-tablet^oral-capsule^oral-solution^intravenous^intramuscular^topical-cream|25 mg^50 mg^12.5 mg/5 mL^50 mg/mL inj|First-gen; strong anticholinergic|High fall risk in older adults|none
olopatadine|Olopatadine|Pataday^Patanol|ophthalmic|Allergic conjunctivitis|Antihistamine eye drops|ophthalmic|0.1%^0.2%^0.7%|Ocular antihistamine|Contact lens rules per label|none
latanoprost|Latanoprost|Xalatan|ophthalmic|Open-angle glaucoma / ocular hypertension|Prostaglandin analog|ophthalmic|0.005%|Increases uveoscleral outflow|Iris pigmentation possible long-term|none
timolol-ophth|Timolol ophthalmic|Timoptic|ophthalmic|Glaucoma|Systemic beta-block absorption possible|ophthalmic|0.25%^0.5%|Topical beta-blocker|May affect HR/asthma sensitive patients|none
tamsulosin|Tamsulosin|Flomax|urologic|BPH symptom relief|Ureteral stone adjunct off-label|oral-capsule|0.4 mg|Alpha-1A blocker|Orthostatic hypotension; floppy iris|none
finasteride|Finasteride|Proscar^Propecia|urologic|BPH (5 mg); male pattern hair loss (1 mg)|Teratogenic handling caution|oral-tablet|1 mg^5 mg|5-alpha reductase inhibitor|Sexual side effects possible|none
oxybutynin|Oxybutynin|Ditropan^Oxytrol|urologic|Overactive bladder|Anticholinergic burden|oral-tablet^oral-syrup^transdermal^topical-gel|5 mg^5 mg XL^10 mg XL^3.9 mg/day patch|Antimuscarinic|Dry mouth, constipation, cognition elderly|none
mirabegron|Mirabegron|Myrbetriq|urologic|Overactive bladder|Beta-3 agonist; BP monitoring|oral-tablet|25 mg^50 mg|Less anticholinergic than oxybutynin|Tachycardia/BP rise possible|none
sildenafil|Sildenafil|Viagra^Revatio|urologic|Erectile dysfunction; PAH (Revatio)|Never with nitrates|oral-tablet^oral-suspension^intravenous|20 mg^25 mg^50 mg^100 mg|PDE5 inhibitor|Hypotension with nitrates absolute|none
tadalafil|Tadalafil|Cialis^Adcirca|urologic|ED; BPH; PAH (Adcirca)|Daily low dose option|oral-tablet|2.5 mg^5 mg^10 mg^20 mg|Longer-acting PDE5|Nitrate contraindication|none
estradiol|Estradiol|Estrace^Vivelle-Dot^Estring|hormone|Menopausal HT; hypoestrogenism|Local vaginal vs systemic risks differ|oral-tablet^transdermal^topical-gel^vaginal^intramuscular|0.5 mg^1 mg^2 mg^0.025 mg/day patch^0.05 mg/day^7.5 mcg vaginal ring|Estrogen therapy individualized|VTE risk discussion systemic therapy|none
progesterone|Progesterone|Prometrium|hormone|Endometrial protection with estrogen; secondary amenorrhea|ART specialty|oral-capsule^vaginal^intramuscular|100 mg^200 mg^50 mg/mL IM|Micronized progesterone|Sedation with oral evening dose|none
medroxyprogesterone|Medroxyprogesterone|Provera^Depo-Provera|hormone|Contraception (Depo); secondary amenorrhea; endometrial protection|Bone density with long Depo use|oral-tablet^intramuscular^subcutaneous|2.5 mg^5 mg^10 mg^150 mg IM|Progestin|Weight/mood changes possible|none
combined-ocp|Ethinyl estradiol/norgestimate|Ortho Tri-Cyclen^Sprintec|hormone|Contraception; acne|VTE risk factors screening|oral-tablet|35 mcg/0.25 mg typical|Combined hormonal contraceptive|Know VTE warning signs|none
calcium-carbonate|Calcium carbonate|Tums^Oscal|supplement|Dietary calcium; dyspepsia|Phosphate binder CKD specialty|oral-tablet^oral-chewable^oral-suspension|500 mg^600 mg^1000 mg|Supplement; constipation possible|Space from levothyroxine/some antibiotics|none
vitamin-d3|Cholecalciferol (Vitamin D3)|Delta D3|supplement|Vitamin D deficiency/insufficiency|Fall/fracture prevention contexts|oral-tablet^oral-capsule^oral-solution^oral-drops|400 IU^1000 IU^2000 IU^5000 IU^50000 IU weekly|Fat-soluble vitamin|Toxicity rare but real with mega-doses|none
ferrous-sulfate|Ferrous sulfate|Feosol|supplement|Iron deficiency anemia|Constipation/black stools expected|oral-tablet^oral-solution^oral-elixir|325 mg (65 mg elemental)^220 mg/5 mL|Take away from calcium/antacids often|GI upset common|none
potassium-chloride|Potassium chloride|Klor-Con^K-Dur|electrolyte|Hypokalemia prevention/treatment|Never IV push undiluted|oral-tablet^oral-capsule^oral-solution^intravenous|8 mEq^10 mEq^20 mEq^40 mEq|Critical electrolyte|Hyperkalemia risk with ACEI/ARB/spironolactone|none
magnesium-oxide|Magnesium oxide|Mag-Ox|supplement|Hypomagnesemia; constipation|Laxative effect|oral-tablet|400 mg|Poor absorption vs other salts sometimes|Diarrhea|none
menthol-topical|Menthol topical|Biofreeze^Icy Hot|topical-analgesic|Counterirritant for minor aches|Adjunct to mobility work|topical-gel^topical-cream^topical-spray^topical-patch|4%^5%^10% menthol varies|Counterirritant—not deep tissue cure|Avoid broken skin and heating pads over product|none
lidocaine-patch|Lidocaine patch|Lidoderm^Salonpas Lidocaine|topical-analgesic|Postherpetic neuralgia; localized neuropathic pain|MSK focal pain off-label|topical-patch^topical-cream^topical-gel|5% patch^4% OTC patch^5% cream|Local anesthetic|Intact skin; max patch count per label|none
capsaicin|Capsaicin|Zostrix^Qutenza|topical-analgesic|Neuropathic and arthritic local pain|High-concentration patch specialty applied|topical-cream^topical-patch^topical-gel|0.025%^0.075%^8% Qutenza|TRPV1 agonist; burning on initiation|Wash hands; avoid eyes|none
diclofenac-topical|Diclofenac topical|Voltaren Arthritis Pain|nsaid|OA joints amenable to topical therapy|Lower systemic NSAID exposure|topical-gel^topical-solution^topical-patch|1% gel^1.5% solution^1.3% patch|Topical NSAID evidence knee/hand OA|Still some systemic absorption|none
pramipexole|Pramipexole|Mirapex|neurologic|Parkinson disease; RLS|Impulse control warnings|oral-tablet|0.125 mg^0.25 mg^0.5 mg^0.75 mg^1 mg^1.5 mg^0.375 mg ER^0.75 mg ER|Dopamine agonist|Orthostasis, sleep attacks|none
ropinirole|Ropinirole|Requip|neurologic|Parkinson; RLS|Same class|oral-tablet|0.25 mg^0.5 mg^1 mg^2 mg^3 mg^4 mg^5 mg^2 mg XL^4 mg XL^6 mg XL^8 mg XL|Dopamine agonist|Impulse control|none
carbidopa-levodopa|Carbidopa/Levodopa|Sinemet^Rytary^Duopa|neurologic|Parkinson disease|Gold-standard dopaminergic|oral-tablet^oral-capsule^enteral-suspension|10/100^25/100^25/250^50/200 CR^Rytary varies|Motor fluctuations common|Schedule PT around ON time|none
entacapone|Entacapone|Comtan|neurologic|Parkinson wearing-off with levodopa|Orange-brown urine|oral-tablet|200 mg|COMT inhibitor|Dyskinesia increase possible|none
rasagiline|Rasagiline|Azilect|neurologic|Parkinson|MAOI-B interactions|oral-tablet|0.5 mg^1 mg|MAOI-B|Tyramine usually less issue selective|none
donepezil|Donepezil|Aricept|neurologic|Alzheimer dementia|GI cholinergic effects|oral-tablet^oral-disintegrating|5 mg^10 mg^23 mg|Cholinesterase inhibitor|Bradycardia, falls, vivid dreams|none
memantine|Memantine|Namenda|neurologic|Moderate–severe Alzheimer dementia|NMDA antagonist|oral-tablet^oral-solution^oral-capsule|5 mg^10 mg^7 mg XR^14 mg XR^21 mg XR^28 mg XR|Often combined with donepezil|Dizziness|none
rivastigmine|Rivastigmine|Exelon|neurologic|Alzheimer; Parkinson dementia|Patch option|oral-capsule^oral-solution^transdermal|1.5 mg^3 mg^4.5 mg^6 mg^4.6 mg/24h patch^9.5 mg^13.3 mg|Cholinesterase inhibitor|GI with oral; patch skin rotation|none
ketoprofen|Ketoprofen|Orudis|nsaid|Pain and inflammation|Topical in some markets|oral-capsule^topical-gel|25 mg^50 mg^75 mg|NSAID class risks|GI risk|none
indomethacin|Indomethacin|Indocin|nsaid|Gout, OA, inflammatory pain|Tocolysis historical inpatient|oral-capsule^oral-suspension^rectal^intravenous|25 mg^50 mg^75 mg ER|Potent NSAID CNS effects|Headache common|none
nabumetone|Nabumetone|Relafen|nsaid|OA/RA|Prodrug NSAID|oral-tablet|500 mg^750 mg|NSAID|Same class|none
etodolac|Etodolac|Lodine|nsaid|OA/RA pain|Some COX-2 preference claims|oral-tablet^oral-capsule|200 mg^300 mg^400 mg^500 mg|NSAID|Same class|none
`.trim().split("\n").filter(Boolean);

function esc(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function parseRow(line) {
  const p = line.split("|");
  if (p.length < 10) throw new Error("Bad row: " + line.slice(0, 80));
  const [slug, generic, brands, cls, primary, offLabel, routes, strengths, evidence, pt, sched] = p;
  return {
    slug,
    generic,
    brands: brands.split("^").filter(Boolean),
    cls,
    primary,
    offLabel: offLabel.split("^").filter(Boolean),
    routes: routes.split("^").filter(Boolean),
    strengths: strengths.split("^").filter(Boolean),
    evidence,
    pt: pt || "",
    sched: sched && sched !== "none" ? sched : null,
  };
}

const drugs = ROWS.map(parseRow);
// Deduplicate by slug
const seen = new Set();
const unique = drugs.filter((d) => {
  if (seen.has(d.slug)) return false;
  seen.add(d.slug);
  return true;
});

const lines = [];
lines.push(`/**`);
lines.push(` * Clinically significant medication base catalog for Assessment.`);
lines.push(` * Evidence-informed primary and common off-label uses (educational).`);
lines.push(` * Expanded to 100,000 catalog entries via strength × route × formulation editions.`);
lines.push(` * Not a prescribing system — users record what their clinicians prescribed.`);
lines.push(` * Generated by scripts/gen-medications.mjs — edit the script to regenerate.`);
lines.push(` */`);
lines.push(``);
lines.push(`import type { MedicationBase, MedicationClass, MedicationRoute } from "./medications-types";`);
lines.push(``);
lines.push(`function m(p: {`);
lines.push(`  slug: string;`);
lines.push(`  genericName: string;`);
lines.push(`  brandNames: string[];`);
lines.push(`  classId: MedicationClass;`);
lines.push(`  primaryUse: string;`);
lines.push(`  offLabelUses: string[];`);
lines.push(`  routes: MedicationRoute[];`);
lines.push(`  strengths: string[];`);
lines.push(`  evidenceNote: string;`);
lines.push(`  ptRelevantNotes?: string;`);
lines.push(`  controlledSchedule?: MedicationBase["controlledSchedule"];`);
lines.push(`}): MedicationBase {`);
lines.push(`  const searchTerms = Array.from(`);
lines.push(`    new Set(`);
lines.push(`      [`);
lines.push(`        p.genericName,`);
lines.push(`        p.slug.replace(/-/g, " "),`);
lines.push(`        ...p.brandNames,`);
lines.push(`        p.primaryUse,`);
lines.push(`        ...p.offLabelUses,`);
lines.push(`        ...p.strengths,`);
lines.push(`        ...p.routes,`);
lines.push(`        p.classId.replace(/-/g, " "),`);
lines.push(`      ]`);
lines.push(`        .join(" ")`);
lines.push(`        .toLowerCase()`);
lines.push(`        .split(/[^a-z0-9+.\\/]+/)`);
lines.push(`        .filter((t) => t.length > 1)`);
lines.push(`    )`);
lines.push(`  );`);
lines.push(`  return {`);
lines.push(`    id: \`med-\${p.slug}\`,`);
lines.push(`    slug: p.slug,`);
lines.push(`    genericName: p.genericName,`);
lines.push(`    brandNames: p.brandNames,`);
lines.push(`    classId: p.classId,`);
lines.push(`    primaryUse: p.primaryUse,`);
lines.push(`    offLabelUses: p.offLabelUses,`);
lines.push(`    routes: p.routes,`);
lines.push(`    defaultRoute: p.routes[0]!,`);
lines.push(`    commonStrengths: p.strengths,`);
lines.push(`    evidenceNote: p.evidenceNote,`);
lines.push(`    ptRelevantNotes: p.ptRelevantNotes,`);
lines.push(`    controlledSchedule: p.controlledSchedule ?? "none",`);
lines.push(`    searchTerms,`);
lines.push(`  };`);
lines.push(`}`);
lines.push(``);
lines.push(`export const MEDICATION_BASE_SEEDS: MedicationBase[] = [`);

for (const d of unique) {
  lines.push(`  m({`);
  lines.push(`    slug: '${esc(d.slug)}',`);
  lines.push(`    genericName: '${esc(d.generic)}',`);
  lines.push(`    brandNames: [${d.brands.map((b) => `'${esc(b)}'`).join(", ")}],`);
  lines.push(`    classId: '${esc(d.cls)}' as MedicationClass,`);
  lines.push(`    primaryUse: '${esc(d.primary)}',`);
  lines.push(`    offLabelUses: [${d.offLabel.map((o) => `'${esc(o)}'`).join(", ")}],`);
  lines.push(`    routes: [${d.routes.map((r) => `'${esc(r)}'`).join(", ")}] as MedicationRoute[],`);
  lines.push(`    strengths: [${d.strengths.map((s) => `'${esc(s)}'`).join(", ")}],`);
  lines.push(`    evidenceNote: '${esc(d.evidence)}',`);
  if (d.pt) lines.push(`    ptRelevantNotes: '${esc(d.pt)}',`);
  if (d.sched) lines.push(`    controlledSchedule: '${esc(d.sched)}',`);
  lines.push(`  }),`);
}

lines.push(`];`);
lines.push(``);
lines.push(`export const MEDICATION_BASE_COUNT = MEDICATION_BASE_SEEDS.length;`);

const out = path.join(root, "src/data/medication-bases.ts");
fs.writeFileSync(out, lines.join("\n") + "\n");
console.log(`Wrote ${unique.length} bases → ${out}`);
