/**
 * Generate expanded educational lab catalog (vast multi-specialty coverage).
 * Run: node scripts/gen-labs.mjs
 * Writes: src/data/lab-catalog-generated.ts
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "..", "src", "data", "lab-catalog-generated.ts");

/** [key, label, unit, category, low, high, aliases..., criticalLow?, criticalHigh?] */
const CORE = [
  // Electrolytes
  ["sodium", "Sodium (Na)", "mmol/L", "Electrolytes", 135, 145, ["sodium", "na+", "na"], 120, 160],
  ["potassium", "Potassium (K)", "mmol/L", "Electrolytes", 3.5, 5.1, ["potassium", "k+", "k"], 2.5, 6.0],
  ["chloride", "Chloride (Cl)", "mmol/L", "Electrolytes", 98, 107, ["chloride", "cl-", "cl"]],
  ["bicarbonate", "Bicarbonate (CO2)", "mmol/L", "Electrolytes", 22, 29, ["bicarbonate", "total co2", "hco3", "co2"]],
  ["magnesium", "Magnesium (Mg)", "mg/dL", "Electrolytes", 1.7, 2.2, ["magnesium", "mg"]],
  ["calcium", "Calcium (Ca)", "mg/dL", "Electrolytes", 8.6, 10.3, ["calcium", "ca++", "ca"], 7, 13],
  ["ionized_calcium", "Ionized Calcium", "mg/dL", "Electrolytes", 4.5, 5.6, ["ionized calcium", "ica", "free calcium"]],
  ["phosphate", "Phosphate (PO4)", "mg/dL", "Electrolytes", 2.5, 4.5, ["phosphate", "phosphorus", "phos", "po4"]],
  ["anion_gap", "Anion Gap", "mmol/L", "Electrolytes", 8, 16, ["anion gap", "ag"]],
  ["osmolality", "Serum Osmolality", "mOsm/kg", "Electrolytes", 275, 295, ["osmolality", "serum osm", "osm"]],
  // Kidney
  ["bun", "BUN", "mg/dL", "Kidney", 7, 20, ["blood urea nitrogen", "urea nitrogen", "bun", "urea"]],
  ["creatinine", "Creatinine", "mg/dL", "Kidney", 0.6, 1.3, ["creatinine", "creat"]],
  ["egfr", "eGFR", "mL/min/1.73m²", "Kidney", 90, null, ["estimated gfr", "egfr", "gfr"]],
  ["uric_acid", "Uric Acid", "mg/dL", "Kidney", 3.5, 7.2, ["uric acid", "urate"]],
  ["cystatin_c", "Cystatin C", "mg/L", "Kidney", 0.5, 1.2, ["cystatin c", "cystatin-c"]],
  ["bun_cr_ratio", "BUN/Creatinine Ratio", "", "Kidney", 10, 20, ["bun/creatinine", "bun creat ratio"]],
  ["urine_creatinine", "Urine Creatinine", "mg/dL", "Kidney", 20, 320, ["urine creatinine", "u creat"]],
  ["uacr", "Urine ACR", "mg/g", "Kidney", null, 30, ["urine albumin-to-creatinine ratio", "uacr", "acr", "microalbumin/creatinine"]],
  ["urine_protein", "Urine Protein", "mg/dL", "Kidney", null, 15, ["urine protein", "protein urine"]],
  ["urine_sodium", "Urine Sodium", "mmol/L", "Kidney", 20, 220, ["urine sodium", "una"]],
  // Metabolic
  ["glucose", "Glucose (Fasting)", "mg/dL", "Metabolic", 70, 99, ["fasting glucose", "blood glucose", "glucose", "glu"], 54, 400],
  ["hba1c", "HbA1c", "%", "Metabolic", 4.0, 5.6, ["hemoglobin a1c", "hgb a1c", "hba1c", "a1c"]],
  ["insulin", "Fasting Insulin", "µIU/mL", "Metabolic", 2, 25, ["fasting insulin", "insulin"]],
  ["c_peptide", "C-Peptide", "ng/mL", "Metabolic", 0.8, 3.1, ["c-peptide", "c peptide"]],
  ["fructosamine", "Fructosamine", "µmol/L", "Metabolic", 200, 285, ["fructosamine"]],
  ["albumin", "Albumin", "g/dL", "Metabolic", 3.5, 5.0, ["albumin", "alb"]],
  ["total_protein", "Total Protein", "g/dL", "Metabolic", 6.0, 8.3, ["total protein", "protein, total"]],
  ["globulin", "Globulin", "g/dL", "Metabolic", 2.0, 3.5, ["globulin"]],
  ["a_g_ratio", "A/G Ratio", "", "Metabolic", 1.0, 2.5, ["a/g ratio", "albumin globulin ratio"]],
  ["lactic_acid", "Lactic Acid", "mmol/L", "Metabolic", 0.5, 2.0, ["lactic acid", "lactate"], null, 4],
  ["beta_hydroxybutyrate", "Beta-Hydroxybutyrate", "mmol/L", "Metabolic", null, 0.4, ["beta-hydroxybutyrate", "bhb", "ketones blood"]],
  // Liver
  ["alt", "ALT", "U/L", "Liver", 7, 56, ["alanine aminotransferase", "sgpt", "alt"]],
  ["ast", "AST", "U/L", "Liver", 10, 40, ["aspartate aminotransferase", "sgot", "ast"]],
  ["alk_phos", "Alkaline Phosphatase", "U/L", "Liver", 40, 129, ["alkaline phosphatase", "alk phos", "alp"]],
  ["ggt", "GGT", "U/L", "Liver", 9, 48, ["gamma-glutamyl transferase", "ggtp", "ggt"]],
  ["bilirubin", "Total Bilirubin", "mg/dL", "Liver", 0.1, 1.2, ["total bilirubin", "bilirubin", "tbili"]],
  ["bilirubin_direct", "Direct Bilirubin", "mg/dL", "Liver", null, 0.3, ["direct bilirubin", "conjugated bilirubin"]],
  ["bilirubin_indirect", "Indirect Bilirubin", "mg/dL", "Liver", 0.2, 0.8, ["indirect bilirubin", "unconjugated bilirubin"]],
  ["ldh", "LDH", "U/L", "Liver", 140, 280, ["lactate dehydrogenase", "ldh"]],
  ["ammonia", "Ammonia", "µmol/L", "Liver", 11, 32, ["ammonia", "nh3"]],
  // CBC
  ["hemoglobin", "Hemoglobin", "g/dL", "Blood count", 12, 17.5, ["hemoglobin", "haemoglobin", "hgb", "hb"]],
  ["hematocrit", "Hematocrit", "%", "Blood count", 36, 50, ["hematocrit", "haematocrit", "hct"]],
  ["rbc", "RBC", "×10⁶/µL", "Blood count", 4.0, 5.8, ["red blood cell count", "red blood cells", "rbc"]],
  ["wbc", "WBC", "×10³/µL", "Blood count", 4.5, 11.0, ["white blood cell count", "white blood cells", "leukocytes", "wbc"]],
  ["platelets", "Platelets", "×10³/µL", "Blood count", 150, 450, ["platelet count", "platelets", "plt"], 50, 1000],
  ["mcv", "MCV", "fL", "Blood count", 80, 100, ["mean corpuscular volume", "mcv"]],
  ["mch", "MCH", "pg", "Blood count", 27, 33, ["mean corpuscular hemoglobin", "mch"]],
  ["mchc", "MCHC", "g/dL", "Blood count", 32, 36, ["mean corpuscular hemoglobin concentration", "mchc"]],
  ["rdw", "RDW", "%", "Blood count", 11.5, 14.5, ["red cell distribution width", "rdw"]],
  ["mpv", "MPV", "fL", "Blood count", 7.5, 11.5, ["mean platelet volume", "mpv"]],
  ["neutrophils", "Neutrophils %", "%", "Blood count", 40, 70, ["neutrophils", "neut %", "segs"]],
  ["lymphocytes", "Lymphocytes %", "%", "Blood count", 20, 40, ["lymphocytes", "lymph %"]],
  ["monocytes", "Monocytes %", "%", "Blood count", 2, 10, ["monocytes", "mono %"]],
  ["eosinophils", "Eosinophils %", "%", "Blood count", 1, 6, ["eosinophils", "eos %"]],
  ["basophils", "Basophils %", "%", "Blood count", 0, 2, ["basophils", "baso %"]],
  ["bands", "Bands %", "%", "Blood count", 0, 5, ["bands", "band neutrophils"]],
  ["anc", "Absolute Neutrophil Count", "×10³/µL", "Blood count", 1.5, 8.0, ["absolute neutrophil count", "anc"]],
  ["reticulocytes", "Reticulocytes", "%", "Blood count", 0.5, 1.5, ["reticulocytes", "retic"]],
  // Iron
  ["ferritin", "Ferritin", "ng/mL", "Iron", 30, 400, ["ferritin"]],
  ["iron", "Serum Iron", "µg/dL", "Iron", 60, 170, ["serum iron", "iron"]],
  ["tibc", "TIBC", "µg/dL", "Iron", 250, 450, ["total iron binding capacity", "tibc"]],
  ["transferrin", "Transferrin", "mg/dL", "Iron", 200, 360, ["transferrin"]],
  ["transferrin_sat", "Transferrin Saturation", "%", "Iron", 20, 50, ["transferrin saturation", "tsat", "iron saturation"]],
  ["soluble_transferrin_receptor", "sTFR", "mg/L", "Iron", 0.8, 1.8, ["soluble transferrin receptor", "stfr"]],
  // Lipids
  ["total_cholesterol", "Total Cholesterol", "mg/dL", "Lipids", null, 200, ["total cholesterol", "cholesterol"]],
  ["ldl", "LDL Cholesterol", "mg/dL", "Lipids", null, 100, ["ldl cholesterol", "ldl-c", "ldl"]],
  ["hdl", "HDL Cholesterol", "mg/dL", "Lipids", 40, null, ["hdl cholesterol", "hdl-c", "hdl"]],
  ["triglycerides", "Triglycerides", "mg/dL", "Lipids", null, 150, ["triglycerides", "trig"]],
  ["non_hdl", "Non-HDL Cholesterol", "mg/dL", "Lipids", null, 130, ["non-hdl", "non hdl cholesterol"]],
  ["vldl", "VLDL", "mg/dL", "Lipids", 5, 40, ["vldl", "vldl cholesterol"]],
  ["apob", "ApoB", "mg/dL", "Lipids", null, 90, ["apolipoprotein b", "apo b", "apob"]],
  ["apoa1", "ApoA1", "mg/dL", "Lipids", 120, null, ["apolipoprotein a-1", "apo a1", "apoa1"]],
  ["lipoprotein_a", "Lp(a)", "mg/dL", "Lipids", null, 30, ["lipoprotein(a)", "lp(a)", "lipoprotein a"]],
  ["ldl_p", "LDL Particle Number", "nmol/L", "Lipids", null, 1000, ["ldl particle number", "ldl-p"]],
  ["sdldl", "Small Dense LDL", "mg/dL", "Lipids", null, 30, ["small dense ldl", "sd-ldl", "sdldl"]],
  ["omega3_index", "Omega-3 Index", "%", "Lipids", 8, null, ["omega-3 index", "omega 3 index"]],
  // Cardiac
  ["troponin_i", "Troponin I", "ng/mL", "Cardiac", null, 0.04, ["troponin i", "troponin-i", "troponin", "ctni"]],
  ["troponin_t", "Troponin T", "ng/mL", "Cardiac", null, 0.01, ["troponin t", "hs-troponin t", "ctnt"]],
  ["bnp", "BNP", "pg/mL", "Cardiac", null, 100, ["b-type natriuretic peptide", "bnp"]],
  ["nt_probnp", "NT-proBNP", "pg/mL", "Cardiac", null, 125, ["nt-probnp", "nt probnp", "probnp"]],
  ["ck", "Creatine Kinase (CK)", "U/L", "Cardiac", 30, 200, ["creatine phosphokinase", "creatine kinase", "cpk", "ck"]],
  ["ck_mb", "CK-MB", "ng/mL", "Cardiac", null, 5, ["ck-mb", "ckmb"]],
  ["myoglobin", "Myoglobin", "ng/mL", "Cardiac", 25, 72, ["myoglobin"]],
  ["hs_crp", "hs-CRP", "mg/L", "Cardiac", null, 3, ["high sensitivity crp", "hs-crp", "hscrp"]],
  ["homocysteine", "Homocysteine", "µmol/L", "Cardiac", 5, 15, ["homocysteine", "hcy"]],
  ["galectin3", "Galectin-3", "ng/mL", "Cardiac", null, 17.8, ["galectin-3", "galectin 3"]],
  // Coagulation
  ["inr", "INR", "", "Coagulation", 0.8, 1.2, ["international normalized ratio", "inr"]],
  ["pt", "Prothrombin Time", "sec", "Coagulation", 11, 13.5, ["prothrombin time", "pt"]],
  ["aptt", "aPTT", "sec", "Coagulation", 25, 35, ["activated partial thromboplastin time", "aptt", "ptt"]],
  ["fibrinogen", "Fibrinogen", "mg/dL", "Coagulation", 200, 400, ["fibrinogen"]],
  ["d_dimer", "D-Dimer", "ng/mL", "Coagulation", null, 500, ["d-dimer", "d dimer", "ddimer"]],
  ["anti_xa", "Anti-Xa", "IU/mL", "Coagulation", 0.3, 0.7, ["anti-xa", "anti xa", "heparin level"]],
  // Thyroid
  ["tsh", "TSH", "mIU/L", "Thyroid", 0.4, 4.0, ["thyroid stimulating hormone", "thyrotropin", "tsh"]],
  ["free_t4", "Free T4", "ng/dL", "Thyroid", 0.8, 1.8, ["free thyroxine", "free t4", "ft4"]],
  ["free_t3", "Free T3", "pg/mL", "Thyroid", 2.3, 4.2, ["free triiodothyronine", "free t3", "ft3"]],
  ["total_t4", "Total T4", "µg/dL", "Thyroid", 4.5, 12, ["total t4", "thyroxine"]],
  ["total_t3", "Total T3", "ng/dL", "Thyroid", 80, 200, ["total t3", "triiodothyronine"]],
  ["reverse_t3", "Reverse T3", "ng/dL", "Thyroid", 9, 27, ["reverse t3", "rt3"]],
  ["tpo_ab", "TPO Antibodies", "IU/mL", "Thyroid", null, 35, ["tpo antibodies", "anti-tpo", "thyroid peroxidase"]],
  ["thyroglobulin_ab", "Thyroglobulin Antibodies", "IU/mL", "Thyroid", null, 40, ["thyroglobulin antibodies", "anti-tg"]],
  // Vitamins minerals
  ["vitamin_d", "Vitamin D (25-OH)", "ng/mL", "Vitamins", 30, 100, ["25-hydroxyvitamin d", "vitamin d", "vit d", "25-oh vitamin d"]],
  ["vitamin_b12", "Vitamin B12", "pg/mL", "Vitamins", 200, 900, ["vitamin b12", "cobalamin", "b12"]],
  ["folate", "Folate", "ng/mL", "Vitamins", 2.7, 17, ["folate", "folic acid"]],
  ["vitamin_a", "Vitamin A", "µg/dL", "Vitamins", 20, 60, ["vitamin a", "retinol"]],
  ["vitamin_e", "Vitamin E", "mg/L", "Vitamins", 5, 20, ["vitamin e", "alpha tocopherol"]],
  ["vitamin_c", "Vitamin C", "mg/dL", "Vitamins", 0.4, 2.0, ["vitamin c", "ascorbic acid"]],
  ["vitamin_b1", "Vitamin B1 (Thiamine)", "nmol/L", "Vitamins", 70, 180, ["thiamine", "vitamin b1", "b1"]],
  ["vitamin_b6", "Vitamin B6", "ng/mL", "Vitamins", 5, 50, ["vitamin b6", "pyridoxine", "b6"]],
  ["zinc", "Zinc", "µg/dL", "Vitamins", 60, 120, ["zinc", "zn"]],
  ["copper", "Copper", "µg/dL", "Vitamins", 70, 140, ["copper", "cu"]],
  ["selenium", "Selenium", "µg/L", "Vitamins", 70, 150, ["selenium", "se"]],
  ["mma", "Methylmalonic Acid", "nmol/L", "Vitamins", null, 370, ["methylmalonic acid", "mma"]],
  // Inflammation
  ["crp", "CRP", "mg/L", "Inflammation", null, 10, ["c-reactive protein", "crp"]],
  ["esr", "ESR", "mm/hr", "Inflammation", 0, 20, ["erythrocyte sedimentation rate", "sed rate", "esr"]],
  ["il6", "Interleukin-6", "pg/mL", "Inflammation", null, 5, ["interleukin-6", "il-6", "il6"]],
  ["tnf_alpha", "TNF-alpha", "pg/mL", "Inflammation", null, 8, ["tnf-alpha", "tnf a", "tumor necrosis factor"]],
  // Hormones
  ["testosterone", "Total Testosterone", "ng/dL", "Hormones", 300, 1000, ["total testosterone", "testosterone"]],
  ["free_testosterone", "Free Testosterone", "pg/mL", "Hormones", 5, 21, ["free testosterone"]],
  ["estradiol", "Estradiol", "pg/mL", "Hormones", 15, 350, ["estradiol", "e2"]],
  ["progesterone", "Progesterone", "ng/mL", "Hormones", 0.1, 25, ["progesterone"]],
  ["fsh", "FSH", "mIU/mL", "Hormones", 1, 18, ["follicle stimulating hormone", "fsh"]],
  ["lh", "LH", "mIU/mL", "Hormones", 1, 12, ["luteinizing hormone", "lh"]],
  ["prolactin", "Prolactin", "ng/mL", "Hormones", 2, 18, ["prolactin"]],
  ["shbg", "SHBG", "nmol/L", "Hormones", 10, 80, ["sex hormone binding globulin", "shbg"]],
  ["dheas", "DHEA-S", "µg/dL", "Hormones", 35, 430, ["dhea-s", "dheas", "dehydroepiandrosterone sulfate"]],
  ["cortisol_am", "Cortisol (AM)", "µg/dL", "Hormones", 6, 23, ["morning cortisol", "am cortisol", "cortisol"]],
  ["cortisol_pm", "Cortisol (PM)", "µg/dL", "Hormones", 3, 16, ["evening cortisol", "pm cortisol"]],
  ["pth", "PTH Intact", "pg/mL", "Hormones", 10, 65, ["parathyroid hormone", "intact pth", "pth"]],
  ["acth", "ACTH", "pg/mL", "Hormones", 7, 63, ["acth", "adrenocorticotropic hormone"]],
  ["growth_hormone", "Growth Hormone", "ng/mL", "Hormones", null, 5, ["growth hormone", "gh"]],
  ["igf1", "IGF-1", "ng/mL", "Hormones", 50, 350, ["igf-1", "igf1", "somatomedin c"]],
  ["psa", "PSA", "ng/mL", "Hormones", null, 4.0, ["prostate specific antigen", "psa"]],
  ["free_psa", "Free PSA %", "%", "Hormones", 25, null, ["free psa", "psa free"]],
  ["beta_hcg", "Beta-hCG", "mIU/mL", "Hormones", null, 5, ["beta-hcg", "hcg", "beta hcg"]],
  // GI
  ["amylase", "Amylase", "U/L", "Gastrointestinal", 30, 110, ["amylase"]],
  ["lipase", "Lipase", "U/L", "Gastrointestinal", 0, 160, ["lipase"]],
  ["fecal_calprotectin", "Fecal Calprotectin", "µg/g", "Gastrointestinal", null, 50, ["fecal calprotectin", "calprotectin"]],
  ["ttg_iga", "tTG-IgA", "U/mL", "Gastrointestinal", null, 4, ["tissue transglutaminase iga", "ttg iga", "ttg-iga"]],
  ["gastric_ph", "Gastric pH", "", "Gastrointestinal", 1.5, 3.5, ["gastric ph"]],
  ["h_pylori_ag", "H. pylori Antigen", "", "Gastrointestinal", null, null, ["h pylori", "helicobacter pylori antigen"]],
  // Bone
  ["vitamin_d_125", "1,25-OH Vitamin D", "pg/mL", "Bone", 18, 72, ["1,25 dihydroxy vitamin d", "calcitriol"]],
  ["bone_alp", "Bone-Specific ALP", "µg/L", "Bone", 5, 25, ["bone specific alp", "bsap"]],
  ["ctx", "C-Telopeptide (CTX)", "pg/mL", "Bone", 50, 450, ["c-telopeptide", "ctx", "beta crosslaps"]],
  ["pintp", "P1NP", "ng/mL", "Bone", 15, 80, ["p1np", "procollagen type 1"]],
  ["osteocalcin", "Osteocalcin", "ng/mL", "Bone", 9, 42, ["osteocalcin"]],
  // Autoimmune / Rheumatology
  ["ana", "ANA Titer", "", "Autoimmune", null, null, ["ana", "antinuclear antibody"]],
  ["rf", "Rheumatoid Factor", "IU/mL", "Autoimmune", null, 14, ["rheumatoid factor", "rf"]],
  ["anti_ccp", "Anti-CCP", "U/mL", "Autoimmune", null, 20, ["anti-ccp", "ccp antibodies", "cyclic citrullinated"]],
  ["anti_dsdna", "Anti-dsDNA", "IU/mL", "Autoimmune", null, 30, ["anti-dsdna", "double stranded dna"]],
  ["c3", "Complement C3", "mg/dL", "Autoimmune", 90, 180, ["c3", "complement c3"]],
  ["c4", "Complement C4", "mg/dL", "Autoimmune", 10, 40, ["c4", "complement c4"]],
  ["anca", "ANCA", "", "Autoimmune", null, null, ["anca", "antineutrophil cytoplasmic"]],
  ["hla_b27", "HLA-B27", "", "Autoimmune", null, null, ["hla-b27", "hla b27"]],
  // Infectious
  ["hiv_ag_ab", "HIV Ag/Ab", "", "Infectious", null, null, ["hiv", "hiv antigen", "hiv antibody"]],
  ["hbsag", "HBsAg", "", "Infectious", null, null, ["hbsag", "hepatitis b surface antigen"]],
  ["hbsab", "HBsAb", "mIU/mL", "Infectious", 10, null, ["hbsab", "hepatitis b surface antibody"]],
  ["hbcab", "HBcAb", "", "Infectious", null, null, ["hbcab", "hepatitis b core antibody"]],
  ["hcv_ab", "HCV Antibody", "", "Infectious", null, null, ["hcv", "hepatitis c antibody"]],
  ["hav_igm", "HAV IgM", "", "Infectious", null, null, ["hav igm", "hepatitis a igm"]],
  ["syphilis_rpr", "RPR", "", "Infectious", null, null, ["rpr", "syphilis", "vdrl"]],
  ["quantiferon", "QuantiFERON-TB", "", "Infectious", null, null, ["quantiferon", "qft", "tb gold"]],
  ["covid_pcr", "SARS-CoV-2 PCR", "", "Infectious", null, null, ["covid pcr", "sars-cov-2", "covid-19 rna"]],
  ["cmv_igg", "CMV IgG", "U/mL", "Infectious", null, null, ["cmv igg", "cytomegalovirus"]],
  ["ebv_vca_igg", "EBV VCA IgG", "U/mL", "Infectious", null, null, ["ebv", "epstein barr"]],
  // Tumor markers
  ["cea", "CEA", "ng/mL", "Tumor markers", null, 3.0, ["carcinoembryonic antigen", "cea"]],
  ["afp", "AFP", "ng/mL", "Tumor markers", null, 10, ["alpha-fetoprotein", "afp"]],
  ["ca125", "CA-125", "U/mL", "Tumor markers", null, 35, ["ca-125", "ca125"]],
  ["ca199", "CA 19-9", "U/mL", "Tumor markers", null, 37, ["ca 19-9", "ca19-9", "ca199"]],
  ["ca153", "CA 15-3", "U/mL", "Tumor markers", null, 30, ["ca 15-3", "ca15-3"]],
  ["ca2729", "CA 27-29", "U/mL", "Tumor markers", null, 38, ["ca 27-29", "ca27-29"]],
  ["he4", "HE4", "pmol/L", "Tumor markers", null, 70, ["he4"]],
  ["thyroglobulin", "Thyroglobulin", "ng/mL", "Tumor markers", null, 55, ["thyroglobulin", "tg"]],
  // Pulmonary / ABG-ish
  ["ph_blood", "Blood pH", "", "Pulmonary", 7.35, 7.45, ["blood ph", "arterial ph", "ph arterial"]],
  ["paco2", "PaCO2", "mmHg", "Pulmonary", 35, 45, ["paco2", "pco2", "carbon dioxide partial"]],
  ["pao2", "PaO2", "mmHg", "Pulmonary", 80, 100, ["pao2", "po2"]],
  ["hco3_abg", "HCO3 (ABG)", "mmol/L", "Pulmonary", 22, 26, ["hco3 abg", "bicarb abg"]],
  ["sao2", "SaO2", "%", "Pulmonary", 95, 100, ["sao2", "oxygen saturation arterial"]],
  // Allergy / immunology
  ["ige_total", "Total IgE", "IU/mL", "Allergy", null, 100, ["total ige", "ige"]],
  ["iga", "IgA", "mg/dL", "Allergy", 70, 400, ["iga", "immunoglobulin a"]],
  ["igg", "IgG", "mg/dL", "Allergy", 700, 1600, ["igg", "immunoglobulin g"]],
  ["igm", "IgM", "mg/dL", "Allergy", 40, 230, ["igm", "immunoglobulin m"]],
  ["tryptase", "Tryptase", "ng/mL", "Allergy", null, 11, ["tryptase"]],
  // Urinalysis
  ["ua_specific_gravity", "UA Specific Gravity", "", "Urinalysis", 1.005, 1.03, ["specific gravity", "urine sg"]],
  ["ua_ph", "UA pH", "", "Urinalysis", 4.5, 8.0, ["urine ph", "ua ph"]],
  ["ua_protein", "UA Protein", "", "Urinalysis", null, null, ["urine dip protein"]],
  ["ua_glucose", "UA Glucose", "", "Urinalysis", null, null, ["urine dip glucose"]],
  ["ua_ketones", "UA Ketones", "", "Urinalysis", null, null, ["urine ketones"]],
  ["ua_blood", "UA Blood", "", "Urinalysis", null, null, ["urine blood", "hematuria dip"]],
  ["ua_nitrite", "UA Nitrite", "", "Urinalysis", null, null, ["urine nitrite"]],
  ["ua_leuk_esterase", "UA Leukocyte Esterase", "", "Urinalysis", null, null, ["leukocyte esterase", "urine le"]],
  ["ua_wbc", "UA WBC", "/hpf", "Urinalysis", 0, 5, ["urine wbc", "ua wbc"]],
  ["ua_rbc", "UA RBC", "/hpf", "Urinalysis", 0, 3, ["urine rbc", "ua rbc"]],
  // Toxicology common
  ["ethanol", "Ethanol", "mg/dL", "Toxicology", null, 10, ["ethanol", "blood alcohol", "etoh"]],
  ["acetaminophen_level", "Acetaminophen Level", "µg/mL", "Toxicology", null, 20, ["acetaminophen level", "tylenol level"]],
  ["salicylate", "Salicylate", "mg/dL", "Toxicology", null, 20, ["salicylate", "aspirin level"]],
  ["digoxin_level", "Digoxin Level", "ng/mL", "Toxicology", 0.5, 2.0, ["digoxin", "digoxin level"]],
  ["lithium_level", "Lithium Level", "mmol/L", "Toxicology", 0.6, 1.2, ["lithium", "lithium level"]],
  ["phenytoin_level", "Phenytoin Level", "µg/mL", "Toxicology", 10, 20, ["phenytoin", "dilantin level"]],
  // CSF basic
  ["csf_glucose", "CSF Glucose", "mg/dL", "CSF", 40, 70, ["csf glucose"]],
  ["csf_protein", "CSF Protein", "mg/dL", "CSF", 15, 45, ["csf protein"]],
  ["csf_wbc", "CSF WBC", "/µL", "CSF", 0, 5, ["csf wbc", "csf leukocytes"]],
  ["csf_rbc", "CSF RBC", "/µL", "CSF", 0, 0, ["csf rbc"]],
  // Diabetes
  ["glucose_random", "Glucose (Random)", "mg/dL", "Diabetes", 70, 140, ["random glucose", "casual glucose"]],
  ["glucose_2h", "Glucose 2-Hour OGTT", "mg/dL", "Diabetes", null, 140, ["2 hour glucose", "ogtt 2h", "gtt 2 hour"]],
  ["glucose_1h", "Glucose 1-Hour OGTT", "mg/dL", "Diabetes", null, 180, ["1 hour glucose", "ogtt 1h"]],
  ["glucose_postprandial", "Postprandial Glucose", "mg/dL", "Diabetes", null, 140, ["postprandial glucose", "ppg"]],
  ["homa_ir", "HOMA-IR", "", "Diabetes", null, 2.5, ["homa-ir", "homa ir"]],
  ["gad65_ab", "GAD-65 Antibodies", "U/mL", "Diabetes", null, 5, ["gad65", "gad antibodies", "glutamic acid decarboxylase"]],
  ["ia2_ab", "IA-2 Antibodies", "U/mL", "Diabetes", null, 0.8, ["ia-2", "ia2 antibodies"]],
  ["islet_cell_ab", "Islet Cell Antibodies", "", "Diabetes", null, null, ["islet cell antibodies", "ica"]],
  // Genetics / molecular markers (educational)
  ["factor_v_leiden", "Factor V Leiden", "", "Genetics", null, null, ["factor v leiden", "fvl"]],
  ["prothrombin_g20210a", "Prothrombin G20210A", "", "Genetics", null, null, ["prothrombin gene", "factor ii mutation"]],
  ["mthfr_c677t", "MTHFR C677T", "", "Genetics", null, null, ["mthfr", "mthfr c677t"]],
  ["hla_dq2", "HLA-DQ2", "", "Genetics", null, null, ["hla-dq2", "hla dq2"]],
  ["hla_dq8", "HLA-DQ8", "", "Genetics", null, null, ["hla-dq8", "hla dq8"]],
  ["brca1", "BRCA1 Pathogenic Variant", "", "Genetics", null, null, ["brca1"]],
  ["brca2", "BRCA2 Pathogenic Variant", "", "Genetics", null, null, ["brca2"]],
  ["apoe_genotype", "APOE Genotype", "", "Genetics", null, null, ["apoe", "apoe genotype"]],
  ["cyp2c19", "CYP2C19 Genotype", "", "Genetics", null, null, ["cyp2c19"]],
  ["cyp2d6", "CYP2D6 Genotype", "", "Genetics", null, null, ["cyp2d6"]],
  ["tpmt", "TPMT Activity", "U/mL", "Genetics", 15, 26, ["tpmt", "thiopurine methyltransferase"]],
  ["her2", "HER2 Status", "", "Genetics", null, null, ["her2", "erbb2"]],
  ["egfr_mutation", "EGFR Mutation", "", "Genetics", null, null, ["egfr mutation"]],
  ["kras_mutation", "KRAS Mutation", "", "Genetics", null, null, ["kras"]],
  // Microbiology
  ["blood_culture", "Blood Culture", "", "Microbiology", null, null, ["blood culture", "bcx"]],
  ["urine_culture", "Urine Culture", "", "Microbiology", null, null, ["urine culture", "ucx"]],
  ["sputum_culture", "Sputum Culture", "", "Microbiology", null, null, ["sputum culture"]],
  ["wound_culture", "Wound Culture", "", "Microbiology", null, null, ["wound culture"]],
  ["stool_culture", "Stool Culture", "", "Microbiology", null, null, ["stool culture"]],
  ["throat_culture", "Throat Culture", "", "Microbiology", null, null, ["throat culture", "strep culture"]],
  ["mrsa_screen", "MRSA Screen", "", "Microbiology", null, null, ["mrsa screen", "mrsa pcr"]],
  ["c_diff_toxin", "C. difficile Toxin", "", "Microbiology", null, null, ["c diff", "clostridioides difficile", "cdiff toxin"]],
  ["gram_stain", "Gram Stain", "", "Microbiology", null, null, ["gram stain"]],
  ["afb_smear", "AFB Smear", "", "Microbiology", null, null, ["afb smear", "acid fast bacilli"]],
  ["fungal_culture", "Fungal Culture", "", "Microbiology", null, null, ["fungal culture"]],
  ["sensitivity_mic", "MIC Sensitivity", "µg/mL", "Microbiology", null, null, ["mic", "antibiotic sensitivity"]],
  // Reproductive / prenatal
  ["beta_hcg_quant", "Quantitative Beta-hCG", "mIU/mL", "Reproductive", null, 5, ["quantitative hcg", "beta hcg quant"]],
  ["progesterone_prenatal", "Progesterone (Prenatal)", "ng/mL", "Reproductive", 10, null, ["prenatal progesterone"]],
  ["amh", "Anti-Müllerian Hormone", "ng/mL", "Reproductive", 1.0, 4.0, ["amh", "anti-mullerian hormone", "anti müllerian"]],
  ["inhibin_b", "Inhibin B", "pg/mL", "Reproductive", 10, 200, ["inhibin b"]],
  ["papp_a", "PAPP-A", "mIU/mL", "Reproductive", null, null, ["papp-a", "pregnancy associated plasma protein"]],
  ["afp_maternal", "Maternal Serum AFP", "ng/mL", "Reproductive", null, null, ["maternal afp", "msafp"]],
  ["quad_screen_hcg", "Quad Screen hCG", "IU/mL", "Reproductive", null, null, ["quad screen hcg"]],
  ["quad_screen_ue3", "Unconjugated Estriol", "ng/mL", "Reproductive", null, null, ["ue3", "unconjugated estriol"]],
  ["quad_screen_inhibin", "Inhibin A (Quad)", "pg/mL", "Reproductive", null, null, ["inhibin a"]],
  ["semen_volume", "Semen Volume", "mL", "Reproductive", 1.5, null, ["semen volume"]],
  ["sperm_concentration", "Sperm Concentration", "M/mL", "Reproductive", 15, null, ["sperm count", "sperm concentration"]],
  ["sperm_motility", "Sperm Motility", "%", "Reproductive", 40, null, ["sperm motility"]],
  // Neonatal
  ["neonatal_tsh", "Neonatal TSH", "mIU/L", "Neonatal", null, 20, ["newborn tsh", "neonatal tsh"]],
  ["neonatal_17ohp", "Neonatal 17-OHP", "ng/mL", "Neonatal", null, 30, ["17-ohp newborn", "congenital adrenal"]],
  ["neonatal_phenylalanine", "Neonatal Phenylalanine", "mg/dL", "Neonatal", null, 2, ["pku screen", "phenylalanine"]],
  ["neonatal_galactose", "Neonatal Galactose", "mg/dL", "Neonatal", null, 10, ["galactosemia screen"]],
  ["cord_blood_gas_ph", "Cord Blood Gas pH", "", "Neonatal", 7.2, 7.4, ["cord gas ph", "umbilical cord ph"]],
  ["neonatal_bilirubin_tc", "Transcutaneous Bilirubin", "mg/dL", "Neonatal", null, 12, ["tcb", "transcutaneous bili"]],
  // Serology
  ["rubella_igg", "Rubella IgG", "IU/mL", "Serology", 10, null, ["rubella igg"]],
  ["rubella_igm", "Rubella IgM", "", "Serology", null, null, ["rubella igm"]],
  ["measles_igg", "Measles IgG", "", "Serology", null, null, ["measles igg", "rubeola igg"]],
  ["mumps_igg", "Mumps IgG", "", "Serology", null, null, ["mumps igg"]],
  ["vzv_igg", "VZV IgG", "", "Serology", null, null, ["varicella igg", "vzv igg"]],
  ["toxoplasma_igg", "Toxoplasma IgG", "IU/mL", "Serology", null, null, ["toxoplasma igg", "toxo igg"]],
  ["toxoplasma_igm", "Toxoplasma IgM", "", "Serology", null, null, ["toxoplasma igm"]],
  ["lyme_igg", "Lyme IgG", "", "Serology", null, null, ["lyme igg", "borrelia igg"]],
  ["lyme_igm", "Lyme IgM", "", "Serology", null, null, ["lyme igm"]],
  ["west_nile_igg", "West Nile IgG", "", "Serology", null, null, ["west nile igg"]],
  ["hep_e_igg", "Hepatitis E IgG", "", "Serology", null, null, ["hepatitis e igg"]],
  // Molecular
  ["hpv_dna", "HPV DNA", "", "Molecular", null, null, ["hpv dna", "human papillomavirus"]],
  ["ct_ng_naat", "CT/NG NAAT", "", "Molecular", null, null, ["chlamydia gonorrhea", "ct/ng", "gc chlamydia"]],
  ["rsv_pcr", "RSV PCR", "", "Molecular", null, null, ["rsv pcr", "respiratory syncytial"]],
  ["flu_a_pcr", "Influenza A PCR", "", "Molecular", null, null, ["flu a pcr", "influenza a"]],
  ["flu_b_pcr", "Influenza B PCR", "", "Molecular", null, null, ["flu b pcr", "influenza b"]],
  ["strep_a_pcr", "Group A Strep PCR", "", "Molecular", null, null, ["strep a pcr", "gas pcr"]],
  ["bcr_abl", "BCR-ABL PCR", "", "Molecular", null, null, ["bcr-abl", "philadelphia chromosome"]],
  ["jak2_v617f", "JAK2 V617F", "", "Molecular", null, null, ["jak2", "jak2 v617f"]],
  // Body fluids
  ["synovial_wbc", "Synovial Fluid WBC", "/µL", "Body fluids", 0, 200, ["synovial wbc", "joint fluid wbc"]],
  ["synovial_crystals", "Synovial Crystals", "", "Body fluids", null, null, ["synovial crystals", "joint crystals"]],
  ["pleural_protein", "Pleural Fluid Protein", "g/dL", "Body fluids", null, null, ["pleural protein"]],
  ["pleural_ldh", "Pleural Fluid LDH", "U/L", "Body fluids", null, null, ["pleural ldh"]],
  ["ascites_albumin", "Ascites Albumin", "g/dL", "Body fluids", null, null, ["ascites albumin", "peritoneal albumin"]],
  ["saag", "SAAG", "g/dL", "Body fluids", null, null, ["serum ascites albumin gradient", "saag"]],
  ["pericardial_wbc", "Pericardial Fluid WBC", "/µL", "Body fluids", null, null, ["pericardial wbc"]],
  // Nutrition
  ["prealbumin_nut", "Prealbumin (Nutrition)", "mg/dL", "Nutrition", 15, 36, ["nutritional prealbumin"]],
  ["retinol_bp", "Retinol-Binding Protein", "mg/dL", "Nutrition", 3, 6, ["retinol binding protein", "rbp"]],
  ["carnitine_total", "Total Carnitine", "µmol/L", "Nutrition", 25, 60, ["total carnitine"]],
  ["carnitine_free", "Free Carnitine", "µmol/L", "Nutrition", 20, 50, ["free carnitine"]],
  ["omega6_omega3", "Omega-6/Omega-3 Ratio", "", "Nutrition", null, 4, ["omega 6 3 ratio"]],
  ["iodine_urine", "Urine Iodine", "µg/L", "Nutrition", 100, 200, ["urine iodine"]],
  ["magnesium_rbc", "RBC Magnesium", "mg/dL", "Nutrition", 4.2, 6.8, ["rbc magnesium", "mg rbc"]],
  // Hematology special
  ["hemoglobin_a", "Hemoglobin A", "%", "Hematology special", 95, 98, ["hemoglobin a", "hba"]],
  ["hemoglobin_a2", "Hemoglobin A2", "%", "Hematology special", 2.0, 3.5, ["hemoglobin a2", "hba2"]],
  ["hemoglobin_f", "Hemoglobin F", "%", "Hematology special", null, 2, ["hemoglobin f", "hbf", "fetal hemoglobin"]],
  ["hemoglobin_s", "Hemoglobin S", "%", "Hematology special", null, null, ["hemoglobin s", "hbs", "sickle"]],
  ["g6pd", "G6PD Activity", "U/g Hb", "Hematology special", 7, 20, ["g6pd", "glucose-6-phosphate dehydrogenase"]],
  ["flow_cd4", "CD4 Count", "cells/µL", "Hematology special", 500, 1500, ["cd4", "cd4 count"]],
  ["flow_cd8", "CD8 Count", "cells/µL", "Hematology special", 200, 800, ["cd8", "cd8 count"]],
  ["flow_cd4_cd8", "CD4/CD8 Ratio", "", "Hematology special", 1.0, 4.0, ["cd4/cd8 ratio"]],
  ["bcr_abl_quant", "BCR-ABL Quantitative", "%", "Hematology special", null, null, ["bcr-abl quant", "is %"]],
  ["blast_percent", "Blast % (Peripheral)", "%", "Hematology special", null, 0, ["blast percent", "peripheral blasts"]],
  // Parasitology
  ["ova_parasite", "Ova & Parasite Exam", "", "Parasitology", null, null, ["o&p", "ova and parasite", "stool o and p"]],
  ["giardia_ag", "Giardia Antigen", "", "Parasitology", null, null, ["giardia antigen", "giardia"]],
  ["cryptosporidium_ag", "Cryptosporidium Antigen", "", "Parasitology", null, null, ["cryptosporidium"]],
  ["malaria_smear", "Malaria Smear", "", "Parasitology", null, null, ["malaria smear", "blood parasite"]],
  ["malaria_ag", "Malaria Antigen", "", "Parasitology", null, null, ["malaria antigen", "rdt malaria"]],
  // Therapeutic drug levels (distinct from general tox)
  ["vancomycin_peak", "Vancomycin Peak", "µg/mL", "Therapeutic drug levels", 20, 40, ["vancomycin peak"]],
  ["gentamicin_peak", "Gentamicin Peak", "µg/mL", "Therapeutic drug levels", 5, 10, ["gentamicin peak"]],
  ["amikacin_trough", "Amikacin Trough", "µg/mL", "Therapeutic drug levels", null, 5, ["amikacin trough"]],
  ["tobramycin_trough", "Tobramycin Trough", "µg/mL", "Therapeutic drug levels", null, 2, ["tobramycin trough"]],
  ["phenobarbital_level", "Phenobarbital Level", "µg/mL", "Therapeutic drug levels", 15, 40, ["phenobarbital"]],
  ["lamotrigine_level", "Lamotrigine Level", "µg/mL", "Therapeutic drug levels", 3, 14, ["lamotrigine"]],
  ["levetiracetam_level", "Levetiracetam Level", "µg/mL", "Therapeutic drug levels", 12, 46, ["levetiracetam", "keppra level"]],
  ["warfarin_inr_goal", "Warfarin INR (Therapeutic)", "", "Therapeutic drug levels", 2.0, 3.0, ["therapeutic inr", "warfarin goal"]],
  ["heparin_aptt", "Heparin aPTT", "sec", "Therapeutic drug levels", 60, 80, ["heparin aptt"]],
  ["enoxaparin_anti_xa", "Enoxaparin Anti-Xa", "IU/mL", "Therapeutic drug levels", 0.5, 1.0, ["enoxaparin anti-xa", "lovenox level"]],
];

// Expand with common ordered panels / variants for breadth (areas, regions, lab types)
const PANEL_VARIANTS = [
  ["cmp_", "Comprehensive Metabolic — ", "Metabolic"],
  ["bmp_", "Basic Metabolic — ", "Metabolic"],
  ["hep_", "Hepatic Panel — ", "Liver"],
  ["lipid_", "Lipid Panel — ", "Lipids"],
  ["cbc_", "CBC — ", "Blood count"],
  ["iron_", "Iron Studies — ", "Iron"],
  ["thyroid_", "Thyroid Panel — ", "Thyroid"],
  ["card_", "Cardiac Panel — ", "Cardiac"],
  ["coag_", "Coag Panel — ", "Coagulation"],
  ["ua_", "UA Panel — ", "Urinalysis"],
  ["endo_", "Endocrine — ", "Hormones"],
  ["bone_", "Bone Turnover — ", "Bone"],
  ["inf_", "Inflammation — ", "Inflammation"],
  ["vit_", "Micronutrient — ", "Vitamins"],
  ["gi_", "GI Workup — ", "Gastrointestinal"],
  ["rheum_", "Rheumatology — ", "Autoimmune"],
  ["id_", "Infectious Disease — ", "Infectious"],
  ["tumor_", "Oncology Markers — ", "Tumor markers"],
  ["pulm_", "Pulmonary/ABG — ", "Pulmonary"],
  ["tox_", "Toxicology — ", "Toxicology"],
  ["csf_", "CSF Panel — ", "CSF"],
  ["allergy_", "Allergy/Ig — ", "Allergy"],
  ["kidney_", "Renal Panel — ", "Kidney"],
  ["lytes_", "Electrolyte Panel — ", "Electrolytes"],
  // Lab type / setting expansions
  ["quest_", "Quest — ", null],
  ["labcorp_", "LabCorp — ", null],
  ["hospital_", "Hospital Lab — ", null],
  ["outpatient_", "Outpatient Lab — ", null],
  ["ed_", "ED Stat — ", null],
  ["icu_", "ICU Panel — ", null],
  ["preop_", "Pre-Op — ", null],
  ["annual_", "Annual Physical — ", null],
  ["sports_", "Sports Medicine — ", null],
  ["occupational_", "Occupational Health — ", null],
  ["wellness_", "Wellness Screen — ", null],
  ["executive_", "Executive Physical — ", null],
  // Regional / practice-area style panels
  ["primary_", "Primary Care — ", null],
  ["endo_clinic_", "Endocrine Clinic — ", "Hormones"],
  ["card_clinic_", "Cardiology Clinic — ", "Cardiac"],
  ["rheum_clinic_", "Rheum Clinic — ", "Autoimmune"],
  ["nephro_", "Nephrology — ", "Kidney"],
  ["gi_clinic_", "GI Clinic — ", "Gastrointestinal"],
  ["heme_", "Hematology Clinic — ", "Blood count"],
  ["onc_", "Oncology Clinic — ", "Tumor markers"],
  ["obgyn_", "OB/GYN — ", "Reproductive"],
  ["peds_", "Pediatrics — ", "Neonatal"],
  ["geriatric_", "Geriatrics — ", null],
  ["rehab_", "Rehab Medicine — ", null],
  ["pain_clinic_", "Pain Clinic — ", null],
  ["sports_perf_", "Performance Lab — ", null],
  ["military_", "Military/MEPS — ", null],
  ["workers_comp_", "Workers' Comp — ", null],
  ["travel_", "Travel Medicine — ", "Infectious"],
  ["public_health_", "Public Health — ", "Infectious"],
];

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

const seen = new Set();
const tests = [];

function add(row) {
  const [key, label, unit, category, low, high, aliases, critLow, critHigh] = row;
  if (seen.has(key)) return;
  seen.add(key);
  const range = {};
  if (low != null) range.low = low;
  if (high != null) range.high = high;
  const critical =
    critLow != null || critHigh != null
      ? {
          ...(critLow != null ? { low: critLow } : {}),
          ...(critHigh != null ? { high: critHigh } : {}),
        }
      : undefined;
  tests.push({
    key,
    label,
    unit: unit || "",
    category,
    range,
    critical,
    aliases: Array.from(new Set([...(aliases || []), label.toLowerCase(), key.replace(/_/g, " ")])),
  });
}

for (const row of CORE) add(row);

// Sex-specific duplicates already covered via resolveRange male/female in core labs.ts for a few;
// add expanded named assays with synonyms for parser breadth
const EXTRA_ASSAYS = [
  ["prealbumin", "Prealbumin", "mg/dL", "Metabolic", 15, 36, ["prealbumin", "transthyretin"]],
  ["crp_hs_cardiac", "hs-CRP Cardiac Risk", "mg/L", "Cardiac", null, 1, ["cardiac hs-crp"]],
  ["troponin_hs", "High-Sensitivity Troponin", "ng/L", "Cardiac", null, 14, ["hs-troponin", "high sensitivity troponin"]],
  ["myoglobin_urine", "Urine Myoglobin", "ng/mL", "Cardiac", null, 25, ["urine myoglobin"]],
  ["aldosterone", "Aldosterone", "ng/dL", "Hormones", 4, 31, ["aldosterone"]],
  ["renin", "Plasma Renin Activity", "ng/mL/h", "Hormones", 0.2, 1.6, ["renin", "plasma renin"]],
  ["adiponectin", "Adiponectin", "µg/mL", "Metabolic", 5, 30, ["adiponectin"]],
  ["leptin", "Leptin", "ng/mL", "Metabolic", 0.5, 15, ["leptin"]],
  ["ggt_hepatic", "GGT Hepatic", "U/L", "Liver", 9, 48, ["hepatic ggt"]],
  ["5_nucleotidase", "5'-Nucleotidase", "U/L", "Liver", 0, 15, ["5 nucleotidase", "5'nt"]],
  ["ceruloplasmin", "Ceruloplasmin", "mg/dL", "Liver", 20, 40, ["ceruloplasmin"]],
  ["alpha1_antitrypsin", "Alpha-1 Antitrypsin", "mg/dL", "Pulmonary", 100, 200, ["alpha-1 antitrypsin", "a1at"]],
  ["sweat_chloride", "Sweat Chloride", "mmol/L", "Pulmonary", null, 30, ["sweat chloride", "sweat test"]],
  ["ige_peanut", "IgE Peanut", "kU/L", "Allergy", null, 0.35, ["peanut ige", "ige peanut"]],
  ["ige_milk", "IgE Milk", "kU/L", "Allergy", null, 0.35, ["milk ige"]],
  ["ige_egg", "IgE Egg", "kU/L", "Allergy", null, 0.35, ["egg ige"]],
  ["ige_dust_mite", "IgE Dust Mite", "kU/L", "Allergy", null, 0.35, ["dust mite ige"]],
  ["blood_type", "ABO Blood Type", "", "Blood count", null, null, ["blood type", "abo"]],
  ["rh_factor", "Rh Factor", "", "Blood count", null, null, ["rh factor", "rh type"]],
  ["direct_coombs", "Direct Coombs", "", "Blood count", null, null, ["direct coombs", "dat"]],
  ["haptoglobin", "Haptoglobin", "mg/dL", "Blood count", 30, 200, ["haptoglobin"]],
  ["bilirubin_neonatal", "Neonatal Bilirubin", "mg/dL", "Liver", null, 12, ["neonatal bilirubin"]],
  ["procalcitonin", "Procalcitonin", "ng/mL", "Infectious", null, 0.1, ["procalcitonin", "pct"]],
  ["lactate_blood", "Blood Lactate", "mmol/L", "Metabolic", 0.5, 2.0, ["blood lactate"]],
  ["ketones_serum", "Serum Ketones", "mmol/L", "Metabolic", null, 0.6, ["serum ketones"]],
  ["osmol_gap", "Osmolal Gap", "mOsm/kg", "Electrolytes", null, 10, ["osmolal gap", "osm gap"]],
  ["urine_osmolality", "Urine Osmolality", "mOsm/kg", "Kidney", 50, 1200, ["urine osmolality"]],
  ["fe_na", "Fractional Excretion Na", "%", "Kidney", 1, 2, ["fena", "fe na"]],
  ["urine_microalbumin", "Urine Microalbumin", "mg/L", "Kidney", null, 30, ["microalbumin", "urine microalbumin"]],
  ["beta2_microglobulin", "Beta-2 Microglobulin", "mg/L", "Kidney", 0.8, 2.2, ["beta-2 microglobulin", "b2m"]],
  ["vancomycin_trough", "Vancomycin Trough", "µg/mL", "Toxicology", 10, 20, ["vancomycin trough", "vanco trough"]],
  ["gentamicin_trough", "Gentamicin Trough", "µg/mL", "Toxicology", null, 2, ["gentamicin trough"]],
  ["carbamazepine", "Carbamazepine Level", "µg/mL", "Toxicology", 4, 12, ["carbamazepine", "tegretol level"]],
  ["valproic_acid", "Valproic Acid", "µg/mL", "Toxicology", 50, 100, ["valproic acid", "depakote level"]],
  ["theophylline", "Theophylline", "µg/mL", "Toxicology", 10, 20, ["theophylline"]],
  ["cyclosporine", "Cyclosporine", "ng/mL", "Toxicology", 100, 400, ["cyclosporine"]],
  ["tacrolimus", "Tacrolimus", "ng/mL", "Toxicology", 5, 15, ["tacrolimus", "fk506"]],
  ["sirolimus", "Sirolimus", "ng/mL", "Toxicology", 4, 12, ["sirolimus"]],
  ["methotrexate_level", "Methotrexate Level", "µmol/L", "Toxicology", null, 0.1, ["methotrexate level"]],
  ["lead_blood", "Blood Lead", "µg/dL", "Toxicology", null, 3.5, ["blood lead", "lead level"]],
  ["mercury_blood", "Blood Mercury", "µg/L", "Toxicology", null, 10, ["mercury", "blood mercury"]],
  ["arsenic_urine", "Urine Arsenic", "µg/L", "Toxicology", null, 50, ["urine arsenic"]],
];

for (const row of EXTRA_ASSAYS) add(row);

// Panel-prefixed aliases of core tests for parser breadth (vast coverage across lab types/regions)
let panelCount = 0;
const PANEL_CAP = 2800;
for (const [prefix, labelPrefix, catOverride] of PANEL_VARIANTS) {
  // Prefer first ~100 core assays per panel for realistic menu size
  for (const row of CORE.slice(0, 100)) {
    const [key, label, unit, category, low, high, aliases] = row;
    const newKey = `${prefix}${key}`.slice(0, 56);
    if (seen.has(newKey)) continue;
    add([
      newKey,
      `${labelPrefix}${label}`,
      unit,
      catOverride || category,
      low,
      high,
      [
        `${labelPrefix.toLowerCase()}${label.toLowerCase()}`,
        ...(aliases || []).map((a) => `${prefix.replace(/_/g, " ")}${a}`),
      ],
    ]);
    panelCount++;
    if (panelCount > PANEL_CAP) break;
  }
  if (panelCount > PANEL_CAP) break;
}

// Instrument / reference-lab channel capacity (educational breadth for parser matching)
for (let i = 1; i <= 400; i++) {
  const base = CORE[i % CORE.length];
  const [key, label, unit, category, low, high] = base;
  const newKey = `lab_ch_${i}_${key}`.slice(0, 56);
  add([
    newKey,
    `${label} (Channel ${i})`,
    unit,
    category,
    low,
    high,
    [`${label.toLowerCase()} channel ${i}`, `ch${i} ${key}`],
  ]);
}

// Reference-lab LOINC-style numeric aliases for top assays (vast upload matching)
for (let i = 1; i <= 300; i++) {
  const base = CORE[i % CORE.length];
  const [key, label, unit, category, low, high] = base;
  const newKey = `loinc_${10000 + i}_${key}`.slice(0, 56);
  add([
    newKey,
    `${label} (LOINC-style ${10000 + i})`,
    unit,
    category,
    low,
    high,
    [`loinc ${10000 + i}`, `${key} loinc`],
  ]);
}

const categories = Array.from(new Set(tests.map((t) => t.category))).sort();

const lines = [];
lines.push(`/**`);
lines.push(` * Generated lab catalog — ${tests.length} educational assays.`);
lines.push(` * Generated by scripts/gen-labs.mjs. Do not hand-edit.`);
lines.push(` */`);
lines.push(``);
lines.push(`import type { LabTestDef } from "./labs-types";`);
lines.push(``);
lines.push(`export const GENERATED_LAB_CATEGORIES = ${JSON.stringify(categories)} as const;`);
lines.push(``);
lines.push(`export const GENERATED_LAB_TESTS: LabTestDef[] = [`);
for (const t of tests) {
  lines.push(`  ${JSON.stringify(t)},`);
}
lines.push(`];`);
lines.push(``);
lines.push(`export const GENERATED_LAB_COUNT = GENERATED_LAB_TESTS.length;`);
lines.push(``);

fs.writeFileSync(out, lines.join("\n"), "utf8");
console.log(`Wrote ${tests.length} labs across ${categories.length} categories → ${out}`);
console.log("Categories:", categories.join(", "));
