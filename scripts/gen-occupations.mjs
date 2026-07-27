/**
 * Generates src/data/occupation-bases.ts — seed occupations for the 100k catalog.
 * Run: node scripts/gen-occupations.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "src", "data", "occupation-bases.ts");

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

/**
 * Seed rows: [title, category, sector, physicalLoad, demandsCSV, settingsCSV, aliasesCSV, mskNotes]
 * categories: desk|standing|labor|healthcare|driving|athlete|student|retired|caregiver|mixed
 */
const SEEDS = [
  // —— Desk / knowledge work ——
  ["Software Engineer", "desk", "Technology", "sedentary", "prolonged-sitting,screen-focus,repetitive-upper", "office,remote-home,data-center", "developer,programmer,coder", "Prolonged sitting and screen focus; thoracic/cervical and wrist load common."],
  ["Software Developer", "desk", "Technology", "sedentary", "prolonged-sitting,screen-focus,repetitive-upper", "office,remote-home", "app developer,full stack developer", "Desk posture and keyboard/mouse repetition."],
  ["Web Developer", "desk", "Technology", "sedentary", "prolonged-sitting,screen-focus,repetitive-upper", "office,remote-home", "", "Seated computer work."],
  ["Data Analyst", "desk", "Technology", "sedentary", "prolonged-sitting,screen-focus", "office,remote-home", "business analyst,data scientist junior", "Long screen sessions."],
  ["Data Scientist", "desk", "Technology", "sedentary", "prolonged-sitting,screen-focus", "office,remote-home,lab-cleanroom", "", "Sedentary compute-heavy role."],
  ["IT Support Specialist", "desk", "Technology", "light", "mixed-postures,screen-focus,lifting-carrying", "office,data-center,client-home", "help desk,desktop support", "Mix of desk work and equipment lifts/crawls under desks."],
  ["Systems Administrator", "desk", "Technology", "light", "prolonged-sitting,screen-focus,mixed-postures", "office,data-center,remote-home", "sysadmin", "Server rooms and desk work."],
  ["Cybersecurity Analyst", "desk", "Technology", "sedentary", "prolonged-sitting,screen-focus,shift-work", "office,remote-home,data-center", "security analyst,SOC analyst", "Often long monitor sessions; night SOC shifts possible."],
  ["Product Manager", "desk", "Technology", "sedentary", "prolonged-sitting,screen-focus", "office,remote-home", "PM", "Meetings and laptop posture."],
  ["Project Manager", "desk", "Business", "sedentary", "prolonged-sitting,screen-focus", "office,remote-home,mixed-sites", "PM,program manager", "Seated meetings; occasional site visits."],
  ["Accountant", "desk", "Finance", "sedentary", "prolonged-sitting,screen-focus,repetitive-upper", "office,remote-home", "CPA,bookkeeper", "Tax-season long sits."],
  ["Financial Analyst", "desk", "Finance", "sedentary", "prolonged-sitting,screen-focus", "office,remote-home", "", "Desk and multi-monitor work."],
  ["Bank Teller", "standing", "Finance", "light", "prolonged-standing,repetitive-upper", "retail-floor,office", "", "Standing counter work with repetitive reach."],
  ["Loan Officer", "desk", "Finance", "sedentary", "prolonged-sitting,screen-focus", "office", "", "Seated client meetings."],
  ["Administrative Assistant", "desk", "Business", "sedentary", "prolonged-sitting,screen-focus,repetitive-upper", "office,clinic-hospital,school-campus", "admin assistant,executive assistant", "Keyboard and phone posture."],
  ["Executive Assistant", "desk", "Business", "sedentary", "prolonged-sitting,screen-focus", "office", "EA", "High meeting/laptop load."],
  ["Receptionist", "desk", "Business", "sedentary", "prolonged-sitting,screen-focus,mixed-postures", "office,clinic-hospital,hotel-hospitality", "front desk", "Desk with intermittent standing."],
  ["Customer Service Representative", "desk", "Business", "sedentary", "prolonged-sitting,screen-focus", "call-center,office,remote-home", "call center agent,CSR", "Headset and seated screen work."],
  ["Call Center Agent", "desk", "Business", "sedentary", "prolonged-sitting,screen-focus,shift-work", "call-center", "contact center", "Long seated headset shifts."],
  ["Human Resources Specialist", "desk", "Business", "sedentary", "prolonged-sitting,screen-focus", "office,remote-home", "HR specialist,HRBP", "Office posture."],
  ["Recruiter", "desk", "Business", "sedentary", "prolonged-sitting,screen-focus", "office,remote-home", "talent acquisition", "Screen and phone-heavy."],
  ["Marketing Specialist", "desk", "Business", "sedentary", "prolonged-sitting,screen-focus", "office,remote-home", "digital marketer", "Laptop posture."],
  ["Content Writer", "desk", "Media", "sedentary", "prolonged-sitting,screen-focus,repetitive-upper", "office,remote-home", "copywriter,technical writer", "Long typing sessions."],
  ["Graphic Designer", "desk", "Media", "sedentary", "prolonged-sitting,screen-focus,repetitive-upper", "office,remote-home,studio-gym", "UI designer,visual designer", "Mouse precision and screen glare."],
  ["UX Designer", "desk", "Technology", "sedentary", "prolonged-sitting,screen-focus", "office,remote-home", "product designer", "Seated computer work."],
  ["Lawyer", "desk", "Legal", "sedentary", "prolonged-sitting,screen-focus,backpack-load", "office,court-public,remote-home", "attorney,counsel", "Long sits, briefcases, court standing."],
  ["Paralegal", "desk", "Legal", "sedentary", "prolonged-sitting,screen-focus", "office,court-public", "", "Document-heavy desk work."],
  ["Judge", "desk", "Legal", "sedentary", "prolonged-sitting,mixed-postures", "court-public", "", "Prolonged sitting on the bench."],
  ["Teacher", "standing", "Education", "light", "prolonged-standing,mixed-postures,backpack-load", "school-campus", "educator,classroom teacher", "On feet, board writing, bag/load."],
  ["Professor", "mixed", "Education", "light", "prolonged-sitting,prolonged-standing,screen-focus", "school-campus,office,remote-home", "lecturer,faculty", "Lecture standing + research desk."],
  ["School Counselor", "desk", "Education", "sedentary", "prolonged-sitting,mixed-postures", "school-campus", "", "Office and campus walking."],
  ["Librarian", "mixed", "Education", "light", "mixed-postures,lifting-carrying,screen-focus", "school-campus,office", "", "Shelving reaches and desk work."],
  ["Student", "student", "Education", "sedentary", "prolonged-sitting,backpack-load,screen-focus", "school-campus,remote-home", "college student,university student,grad student", "Desk + backpack + exam stress load."],
  ["Graduate Student", "student", "Education", "sedentary", "prolonged-sitting,screen-focus,backpack-load", "school-campus,lab-cleanroom,remote-home", "PhD student,masters student", "Long study sits and lab time."],
  ["Research Scientist", "desk", "Science", "light", "prolonged-sitting,mixed-postures,screen-focus", "lab-cleanroom,office", "lab scientist,research associate", "Bench and computer mix."],
  ["Lab Technician", "standing", "Science", "light", "prolonged-standing,repetitive-upper,mixed-postures", "lab-cleanroom,clinic-hospital", "medical lab tech", "Standing bench work, pipetting."],
  ["Architect", "desk", "Design", "sedentary", "prolonged-sitting,screen-focus,mixed-postures", "office,field-outdoors,construction-site", "", "CAD desk + site walks."],
  ["Civil Engineer", "mixed", "Engineering", "light", "mixed-postures,screen-focus", "office,field-outdoors,construction-site", "", "Desk design + site visits."],
  ["Mechanical Engineer", "desk", "Engineering", "light", "prolonged-sitting,screen-focus,mixed-postures", "office,factory-plant,lab-cleanroom", "", "CAD and shop floor."],
  ["Electrical Engineer", "desk", "Engineering", "light", "prolonged-sitting,screen-focus", "office,factory-plant,field-outdoors", "", "Desk and field troubleshooting."],
  ["Industrial Engineer", "mixed", "Engineering", "light", "mixed-postures,prolonged-standing,screen-focus", "factory-plant,office,warehouse", "", "Plant floor observation + desk."],

  // —— Healthcare ——
  ["Registered Nurse", "healthcare", "Healthcare", "medium", "patient-handling,prolonged-standing,lifting-carrying,shift-work", "clinic-hospital,client-home", "RN,nurse", "Transfers, charting posture, long shifts."],
  ["Licensed Practical Nurse", "healthcare", "Healthcare", "medium", "patient-handling,prolonged-standing,shift-work", "clinic-hospital,client-home", "LPN,LVN", "Patient care physical demand."],
  ["Certified Nursing Assistant", "healthcare", "Healthcare", "heavy", "patient-handling,lifting-carrying,prolonged-standing,shift-work", "clinic-hospital,client-home", "CNA,nurse aide", "High transfer and lift frequency."],
  ["Nurse Practitioner", "healthcare", "Healthcare", "light", "prolonged-standing,mixed-postures,screen-focus", "clinic-hospital,office", "NP", "Clinic standing and EHR sitting."],
  ["Physician", "healthcare", "Healthcare", "light", "prolonged-standing,prolonged-sitting,screen-focus,shift-work", "clinic-hospital,office", "doctor,MD,DO", "Procedures, rounds, EHR."],
  ["Physician Assistant", "healthcare", "Healthcare", "light", "mixed-postures,prolonged-standing,screen-focus", "clinic-hospital", "PA", "Clinic physical and charting load."],
  ["Physical Therapist", "healthcare", "Healthcare", "medium", "patient-handling,mixed-postures,lifting-carrying", "clinic-hospital,client-home,studio-gym", "PT,DPT", "Manual therapy, transfers, demo exercises."],
  ["Occupational Therapist", "healthcare", "Healthcare", "medium", "patient-handling,mixed-postures", "clinic-hospital,client-home,school-campus", "OT", "Functional training and handling."],
  ["Speech-Language Pathologist", "healthcare", "Healthcare", "light", "prolonged-sitting,mixed-postures", "clinic-hospital,school-campus", "SLP,speech therapist", "Seated sessions; some school mobility."],
  ["Respiratory Therapist", "healthcare", "Healthcare", "medium", "prolonged-standing,lifting-carrying,shift-work", "clinic-hospital", "RT", "Equipment and bedside work."],
  ["Radiologic Technologist", "healthcare", "Healthcare", "medium", "prolonged-standing,lifting-carrying,mixed-postures,shift-work", "clinic-hospital", "x-ray tech,radiographer", "Patient positioning and lead apron load."],
  ["Ultrasound Technologist", "healthcare", "Healthcare", "medium", "prolonged-standing,repetitive-upper,mixed-postures", "clinic-hospital", "sonographer", "Probe grip and awkward reach."],
  ["Surgical Technologist", "healthcare", "Healthcare", "medium", "prolonged-standing,shift-work", "clinic-hospital", "scrub tech", "Long standing in OR."],
  ["Pharmacist", "healthcare", "Healthcare", "light", "prolonged-standing,prolonged-sitting,repetitive-upper", "retail-floor,clinic-hospital", "", "Standing dispensary + computer."],
  ["Pharmacy Technician", "healthcare", "Healthcare", "light", "prolonged-standing,repetitive-upper", "retail-floor,clinic-hospital", "pharmacy tech", "Standing counting and reaching."],
  ["Dental Hygienist", "healthcare", "Healthcare", "medium", "prolonged-sitting,repetitive-upper,mixed-postures", "clinic-hospital", "", "Static neck/shoulder posture."],
  ["Dentist", "healthcare", "Healthcare", "medium", "prolonged-sitting,repetitive-upper,mixed-postures", "clinic-hospital", "DDS,DMD", "Prolonged flexed neck/shoulder."],
  ["Medical Assistant", "healthcare", "Healthcare", "light", "mixed-postures,prolonged-standing,patient-handling", "clinic-hospital", "MA", "Rooming patients, vitals, EHR."],
  ["Emergency Medical Technician", "healthcare", "Healthcare", "heavy", "patient-handling,lifting-carrying,shift-work,mixed-postures", "vehicle-cab,field-outdoors,clinic-hospital", "EMT", "Lifts, stairs, awkward carries."],
  ["Paramedic", "healthcare", "Healthcare", "heavy", "patient-handling,lifting-carrying,shift-work", "vehicle-cab,field-outdoors,clinic-hospital", "", "High acute physical demand."],
  ["Home Health Aide", "caregiver", "Healthcare", "medium", "patient-handling,lifting-carrying,mixed-postures", "client-home", "HHA", "Home transfers and care tasks."],
  ["Personal Care Aide", "caregiver", "Healthcare", "medium", "patient-handling,lifting-carrying", "client-home", "PCA", "ADL assist physical load."],
  ["Caregiver", "caregiver", "Healthcare", "medium", "patient-handling,lifting-carrying,mixed-postures", "client-home", "family caregiver,full-time caregiver", "Transfer and care mechanics."],
  ["Veterinarian", "healthcare", "Healthcare", "medium", "lifting-carrying,mixed-postures,prolonged-standing", "clinic-hospital,farm-ranch", "vet", "Animal handling and awkward lifts."],
  ["Veterinary Technician", "healthcare", "Healthcare", "medium", "lifting-carrying,prolonged-standing", "clinic-hospital", "vet tech", "Restraint and cleaning physical work."],
  ["Massage Therapist", "healthcare", "Wellness", "medium", "prolonged-standing,repetitive-upper,mixed-postures", "clinic-hospital,studio-gym,client-home", "LMT", "Sustained upper-body force."],
  ["Chiropractor", "healthcare", "Healthcare", "medium", "mixed-postures,repetitive-upper", "clinic-hospital", "DC", "Manual force and trunk rotation."],

  // —— Labor / trades ——
  ["Construction Laborer", "labor", "Construction", "heavy", "lifting-carrying,mixed-postures", "construction-site,field-outdoors", "construction worker", "Heavy materials and ground work."],
  ["Carpenter", "labor", "Construction", "heavy", "lifting-carrying,mixed-postures,repetitive-upper", "construction-site,field-outdoors", "", "Kneeling, overhead, tool vibration."],
  ["Electrician", "labor", "Trades", "medium", "mixed-postures,lifting-carrying,repetitive-upper", "construction-site,factory-plant,client-home", "", "Overhead work, ladders, cable pull."],
  ["Plumber", "labor", "Trades", "heavy", "mixed-postures,lifting-carrying", "construction-site,client-home", "", "Crawl spaces, lifting fixtures."],
  ["HVAC Technician", "labor", "Trades", "heavy", "lifting-carrying,mixed-postures", "client-home,rooftop,factory-plant", "HVAC tech", "Rooftop units and attic work."],
  ["Welder", "labor", "Manufacturing", "heavy", "mixed-postures,lifting-carrying,prolonged-standing", "factory-plant,ship-yard,construction-site", "", "Static postures and PPE load."],
  ["Ironworker", "labor", "Construction", "very-heavy", "lifting-carrying,mixed-postures", "construction-site,ship-yard", "steelworker", "Heavy steel and heights."],
  ["Roofer", "labor", "Construction", "heavy", "lifting-carrying,mixed-postures", "construction-site,field-outdoors", "", "Inclines, heat, material lifts."],
  ["Painter", "labor", "Trades", "medium", "mixed-postures,repetitive-upper,prolonged-standing", "construction-site,client-home", "house painter", "Overhead reach and ladders."],
  ["Drywall Installer", "labor", "Construction", "heavy", "lifting-carrying,mixed-postures", "construction-site", "taper,sheetrocker", "Sheet lifts and overhead."],
  ["Heavy Equipment Operator", "labor", "Construction", "medium", "prolonged-sitting,mixed-postures,driving-seated", "construction-site,mine-energy,field-outdoors", "excavator operator,bulldozer operator", "Cab vibration and sitting."],
  ["Warehouse Associate", "labor", "Logistics", "heavy", "lifting-carrying,prolonged-standing,repetitive-upper", "warehouse", "warehouse worker,picker packer", "Picking, packing, pallet work."],
  ["Forklift Operator", "labor", "Logistics", "medium", "prolonged-sitting,mixed-postures,lifting-carrying", "warehouse,factory-plant", "lift truck operator", "Cab sit and dock work."],
  ["Material Handler", "labor", "Logistics", "heavy", "lifting-carrying,mixed-postures", "warehouse,factory-plant", "", "Manual material movement."],
  ["Package Delivery Driver", "driving", "Logistics", "medium", "driving-seated,lifting-carrying,mixed-postures", "vehicle-cab,field-outdoors", "delivery driver,UPS driver,FedEx driver", "Drive + package lifts + stairs."],
  ["Amazon Delivery Driver", "driving", "Logistics", "medium", "driving-seated,lifting-carrying,mixed-postures", "vehicle-cab,field-outdoors", "DSP driver", "High stop density lifting."],
  ["Truck Driver", "driving", "Transportation", "medium", "driving-seated,prolonged-sitting", "vehicle-cab", "CDL driver,long haul driver,semi driver", "Long seated vibration exposure."],
  ["Long-Haul Truck Driver", "driving", "Transportation", "medium", "driving-seated,prolonged-sitting,shift-work", "vehicle-cab", "over-the-road driver", "Extended cab sitting."],
  ["Bus Driver", "driving", "Transportation", "medium", "driving-seated,prolonged-sitting,shift-work", "vehicle-cab", "transit operator", "Seated driving with schedule pressure."],
  ["Taxi Driver", "driving", "Transportation", "medium", "driving-seated,prolonged-sitting", "vehicle-cab", "cab driver", "Prolonged sitting."],
  ["Rideshare Driver", "driving", "Transportation", "medium", "driving-seated,prolonged-sitting", "vehicle-cab", "Uber driver,Lyft driver", "Long seated hours."],
  ["Courier", "mixed", "Logistics", "medium", "mixed-postures,lifting-carrying,driving-seated", "vehicle-cab,field-outdoors", "bike courier,messenger", "Vehicle or bike + package work."],
  ["Factory Worker", "labor", "Manufacturing", "medium", "prolonged-standing,repetitive-upper,lifting-carrying", "factory-plant", "production worker,assembler", "Line standing and repetition."],
  ["Assembly Line Worker", "labor", "Manufacturing", "medium", "prolonged-standing,repetitive-upper", "factory-plant", "assembler", "Repetitive cycle work."],
  ["Machinist", "labor", "Manufacturing", "medium", "prolonged-standing,mixed-postures,lifting-carrying", "factory-plant", "CNC operator", "Standing shop work."],
  ["Maintenance Technician", "labor", "Facilities", "medium", "mixed-postures,lifting-carrying", "factory-plant,office,hotel-hospitality", "building maintenance,facilities tech", "Repairs in awkward spaces."],
  ["Janitor", "labor", "Facilities", "medium", "lifting-carrying,mixed-postures,prolonged-standing", "office,school-campus,clinic-hospital", "custodian,cleaner", "Push/pull and floor work."],
  ["Custodian", "labor", "Facilities", "medium", "lifting-carrying,mixed-postures", "school-campus,office", "", "Cleaning physical demand."],
  ["Landscaper", "labor", "Grounds", "heavy", "lifting-carrying,mixed-postures", "field-outdoors", "groundskeeper,lawn care", "Outdoor lifts and vibration tools."],
  ["Farmer", "labor", "Agriculture", "heavy", "lifting-carrying,mixed-postures,prolonged-standing", "farm-ranch,field-outdoors", "rancher,agricultural worker", "Seasonal heavy physical work."],
  ["Farm Worker", "labor", "Agriculture", "heavy", "lifting-carrying,mixed-postures", "farm-ranch,field-outdoors", "field hand,migrant farm worker", "Repetitive harvest postures."],
  ["Mechanic", "labor", "Automotive", "heavy", "mixed-postures,lifting-carrying,prolonged-standing", "factory-plant,client-home", "auto mechanic,automotive technician", "Under-vehicle and heavy parts."],
  ["Auto Body Technician", "labor", "Automotive", "heavy", "mixed-postures,lifting-carrying,repetitive-upper", "factory-plant", "body shop tech", "Forceful upper body work."],
  ["Oilfield Worker", "labor", "Energy", "very-heavy", "lifting-carrying,mixed-postures,shift-work", "field-outdoors,mine-energy", "roughneck,rig hand", "Extreme physical and shift demand."],
  ["Miner", "labor", "Energy", "very-heavy", "lifting-carrying,mixed-postures,shift-work", "mine-energy", "underground miner", "Heavy confined work."],
  ["Firefighter", "labor", "Public Safety", "very-heavy", "lifting-carrying,mixed-postures,shift-work", "field-outdoors,mixed-sites", "", "PPE load, lifts, high intensity."],
  ["Police Officer", "mixed", "Public Safety", "medium", "mixed-postures,driving-seated,shift-work", "vehicle-cab,field-outdoors,court-public", "cop,law enforcement", "Duty belt, vehicle sit, sudden efforts."],
  ["Security Guard", "standing", "Public Safety", "light", "prolonged-standing,mixed-postures,shift-work", "office,retail-floor,airport-terminal", "security officer", "Standing/walking patrols."],
  ["Military Service Member", "mixed", "Military", "heavy", "lifting-carrying,mixed-postures,high-intensity-training,shift-work", "military-base,field-outdoors", "soldier,sailor,airman,marine", "Load carriage and training volume."],

  // —— Standing / service ——
  ["Retail Sales Associate", "standing", "Retail", "light", "prolonged-standing,mixed-postures", "retail-floor", "sales associate,store associate", "On feet with intermittent stock lifts."],
  ["Cashier", "standing", "Retail", "light", "prolonged-standing,repetitive-upper", "retail-floor", "checkout clerk", "Standing and repetitive scan reach."],
  ["Stock Clerk", "labor", "Retail", "medium", "lifting-carrying,mixed-postures,prolonged-standing", "retail-floor,warehouse", "stocker,overnight stocker", "Shelving and case lifts."],
  ["Store Manager", "mixed", "Retail", "light", "prolonged-standing,mixed-postures,screen-focus", "retail-floor,office", "", "Floor time + admin desk."],
  ["Barista", "standing", "Food Service", "light", "prolonged-standing,repetitive-upper", "kitchen-foodservice,retail-floor", "", "Standing, wrist/shoulder coffee prep."],
  ["Server", "standing", "Food Service", "medium", "prolonged-standing,lifting-carrying,mixed-postures", "kitchen-foodservice,hotel-hospitality", "waiter,waitress", "Carrying trays and long stands."],
  ["Bartender", "standing", "Food Service", "light", "prolonged-standing,repetitive-upper", "kitchen-foodservice,hotel-hospitality", "", "Standing reach and bottle handling."],
  ["Cook", "standing", "Food Service", "medium", "prolonged-standing,repetitive-upper,lifting-carrying", "kitchen-foodservice", "line cook,prep cook", "Hot kitchen standing."],
  ["Chef", "standing", "Food Service", "medium", "prolonged-standing,lifting-carrying,mixed-postures", "kitchen-foodservice,hotel-hospitality", "head chef,sous chef", "Long kitchen stands and lifts."],
  ["Dishwasher", "standing", "Food Service", "medium", "prolonged-standing,lifting-carrying,repetitive-upper", "kitchen-foodservice", "steward", "Wet standing repetitive work."],
  ["Food Delivery Driver", "driving", "Food Service", "medium", "driving-seated,mixed-postures", "vehicle-cab,field-outdoors", "DoorDash,Uber Eats driver", "Drive + carry bags."],
  ["Hair Stylist", "standing", "Personal Care", "medium", "prolonged-standing,repetitive-upper", "studio-gym,retail-floor", "barber,cosmetologist,hairdresser", "Standing with elevated arms."],
  ["Barber", "standing", "Personal Care", "medium", "prolonged-standing,repetitive-upper", "studio-gym", "", "Sustained standing arm work."],
  ["Esthetician", "standing", "Personal Care", "light", "prolonged-standing,mixed-postures", "studio-gym,clinic-hospital", "skin care specialist", "Static trunk posture over clients."],
  ["Nail Technician", "sitting", "Personal Care", "light", "prolonged-sitting,repetitive-upper", "studio-gym", "manicurist", "Seated forward flexion and fine motor."],
  // fix sitting -> desk
  ["Flight Attendant", "standing", "Transportation", "medium", "prolonged-standing,lifting-carrying,mixed-postures,shift-work", "airport-terminal,vehicle-cab", "cabin crew", "Carts, overhead bins, jet lag shifts."],
  ["Flight Attendant", "standing", "Transportation", "medium", "prolonged-standing,lifting-carrying,shift-work", "airport-terminal", "cabin crew attendant", "On-feet cabin service."],
  ["Hotel Housekeeper", "labor", "Hospitality", "medium", "lifting-carrying,mixed-postures,prolonged-standing", "hotel-hospitality", "room attendant", "Beds, carts, repetitive clean."],
  ["Concierge", "standing", "Hospitality", "light", "prolonged-standing,mixed-postures", "hotel-hospitality", "", "Standing front desk."],
  ["Tour Guide", "standing", "Hospitality", "light", "prolonged-standing,mixed-postures", "field-outdoors,mixed-sites", "", "Walking and talking on feet."],

  // —— Athlete / performance ——
  ["Professional Athlete", "athlete", "Sports", "heavy", "high-intensity-training,mixed-postures", "studio-gym,field-outdoors", "pro athlete", "High training and competition load."],
  ["Collegiate Athlete", "athlete", "Sports", "heavy", "high-intensity-training,mixed-postures", "studio-gym,school-campus,field-outdoors", "college athlete", "Sport + student dual load."],
  ["Personal Trainer", "athlete", "Fitness", "medium", "high-intensity-training,mixed-postures,prolonged-standing", "studio-gym", "fitness trainer,CPT", "Demo lifts and on-feet coaching."],
  ["Strength Coach", "athlete", "Fitness", "medium", "high-intensity-training,lifting-carrying,mixed-postures", "studio-gym,school-campus", "CSCS,S&C coach", "Coaching and demonstration load."],
  ["Yoga Instructor", "athlete", "Fitness", "light", "mixed-postures,prolonged-standing", "studio-gym,remote-home", "yoga teacher", "Demo postures and teaching on feet."],
  ["Dance Instructor", "athlete", "Arts", "medium", "high-intensity-training,mixed-postures,prolonged-standing", "studio-gym", "dance teacher", "Repetitive movement load."],
  ["Professional Dancer", "athlete", "Arts", "heavy", "high-intensity-training,mixed-postures", "studio-gym", "ballet dancer", "High musculoskeletal demand."],
  ["Musician", "mixed", "Arts", "light", "prolonged-sitting,repetitive-upper,mixed-postures", "studio-gym,mixed-sites", "instrumentalist", "Static postures and repetition by instrument."],
  ["Actor", "mixed", "Arts", "light", "mixed-postures,prolonged-standing", "studio-gym,mixed-sites", "performer", "Variable physical rehearsal load."],

  // —— Retired / other ——
  ["Retired", "retired", "Retirement", "low", "low-physical-demand,mixed-postures", "remote-home,mixed-sites", "retiree", "Home and community ADL focus."],
  ["Stay-at-Home Parent", "caregiver", "Home", "medium", "lifting-carrying,mixed-postures,patient-handling", "remote-home,client-home", "SAHM,SAHD,homemaker", "Child lifts and floor play postures."],
  ["Homemaker", "caregiver", "Home", "medium", "lifting-carrying,mixed-postures", "remote-home", "home maker", "Household physical tasks."],
  ["Volunteer", "mixed", "Community", "light", "mixed-postures", "mixed-sites,school-campus,clinic-hospital", "", "Variable task demand."],
  ["Unemployed Job Seeker", "mixed", "Other", "sedentary", "prolonged-sitting,screen-focus,low-physical-demand", "remote-home", "between jobs", "Often more sitting during search."],
  ["Disability - Not Working", "mixed", "Other", "low", "low-physical-demand", "remote-home", "on disability", "Function-first HEP; avoid over-assuming load."],

  // —— More desk/professional ——
  ["Real Estate Agent", "mixed", "Sales", "light", "mixed-postures,driving-seated,screen-focus", "vehicle-cab,client-home,office", "realtor", "Driving between showings + phone."],
  ["Insurance Agent", "desk", "Finance", "sedentary", "prolonged-sitting,screen-focus", "office,remote-home,client-home", "", "Desk and client meetings."],
  ["Sales Representative", "mixed", "Sales", "light", "driving-seated,mixed-postures,screen-focus", "vehicle-cab,office,client-home", "outside sales,account executive", "Travel sitting and laptop."],
  ["Inside Sales Representative", "desk", "Sales", "sedentary", "prolonged-sitting,screen-focus", "office,call-center,remote-home", "SDR,BDR", "Phone and CRM sitting."],
  ["Consultant", "desk", "Business", "sedentary", "prolonged-sitting,screen-focus,driving-seated", "office,remote-home,client-home,airport-terminal", "management consultant", "Travel + laptop posture."],
  ["Journalist", "desk", "Media", "sedentary", "prolonged-sitting,screen-focus,mixed-postures", "office,remote-home,field-outdoors", "reporter", "Typing and field mobility."],
  ["Photographer", "mixed", "Media", "light", "mixed-postures,lifting-carrying", "field-outdoors,studio-gym", "", "Gear carry and awkward holds."],
  ["Videographer", "mixed", "Media", "medium", "lifting-carrying,mixed-postures", "field-outdoors,studio-gym", "camera operator", "Camera gear and static holds."],
  ["Social Media Manager", "desk", "Media", "sedentary", "prolonged-sitting,screen-focus", "office,remote-home", "", "Phone/laptop neck posture."],
  ["Translator", "desk", "Language", "sedentary", "prolonged-sitting,screen-focus,repetitive-upper", "office,remote-home,court-public", "interpreter office", "Long computer sits."],
  ["Interpreter", "standing", "Language", "light", "prolonged-standing,mixed-postures", "court-public,clinic-hospital,school-campus", "sign language interpreter", "Standing interpretation sessions."],
  ["Pilot Driver", "driving", "Transportation", "medium", "driving-seated,lifting-carrying", "vehicle-cab,airport-terminal", "", "Vehicle sit + luggage."],
  ["Pilot", "driving", "Transportation", "light", "prolonged-sitting,shift-work", "vehicle-cab,airport-terminal", "airline pilot,commercial pilot", "Cockpit sitting and irregular shifts."],
  ["Air Traffic Controller", "desk", "Transportation", "sedentary", "prolonged-sitting,screen-focus,shift-work", "airport-terminal,office", "ATC", "High vigilance seated shifts."],
  ["Postal Worker", "mixed", "Logistics", "medium", "lifting-carrying,mixed-postures,driving-seated", "vehicle-cab,field-outdoors,warehouse", "mail carrier,letter carrier", "Walking routes and parcel lifts."],
  ["Mail Carrier", "mixed", "Logistics", "medium", "lifting-carrying,prolonged-standing,mixed-postures", "field-outdoors", "letter carrier", "Walking with satchel load."],
  ["Trash Collector", "labor", "Sanitation", "heavy", "lifting-carrying,mixed-postures,shift-work", "field-outdoors,vehicle-cab", "sanitation worker,garbage collector", "Repetitive heavy lifts."],
  ["Recycling Worker", "labor", "Sanitation", "heavy", "lifting-carrying,repetitive-upper,prolonged-standing", "warehouse,factory-plant", "", "Sorting and lifting."],
  ["Childcare Worker", "caregiver", "Education", "medium", "lifting-carrying,mixed-postures,patient-handling", "school-campus,client-home", "daycare teacher,nanny", "Child lifts and floor time."],
  ["Nanny", "caregiver", "Home", "medium", "lifting-carrying,mixed-postures", "client-home", "au pair", "Child handling and home tasks."],
  ["Social Worker", "mixed", "Social Services", "light", "mixed-postures,driving-seated,screen-focus", "office,client-home,clinic-hospital", "case worker", "Office + field visits."],
  ["Case Manager", "desk", "Social Services", "sedentary", "prolonged-sitting,screen-focus,mixed-postures", "office,clinic-hospital,client-home", "", "Documentation sitting + visits."],
  ["Therapist Counselor", "desk", "Mental Health", "sedentary", "prolonged-sitting", "office,clinic-hospital,remote-home", "mental health counselor,psychotherapist,LCSW,LMFT", "Prolonged seated sessions."],
  ["Psychologist", "desk", "Mental Health", "sedentary", "prolonged-sitting,screen-focus", "office,clinic-hospital,school-campus", "clinical psychologist", "Seated clinical work."],
  ["Psychiatrist", "healthcare", "Mental Health", "sedentary", "prolonged-sitting,screen-focus", "clinic-hospital,office", "", "Seated evaluations and EHR."],
];

// Fix any invalid category "sitting" if present
for (const row of SEEDS) {
  if (row[1] === "sitting") row[1] = "desk";
  if (row[3] === "low") row[3] = "sedentary";
}

// Expand with sector-specific title variants to reach a rich base set
const TITLE_MODIFIERS = [
  "",
  "Senior ",
  "Junior ",
  "Lead ",
  "Assistant ",
  "Associate ",
  "Staff ",
  "Principal ",
  "Traveling ",
  "Remote ",
  "Contract ",
  "Night-Shift ",
  "Per Diem ",
  "Float ",
  "Regional ",
  "Clinical ",
  "Industrial ",
  "Commercial ",
  "Residential ",
  "Pediatric ",
  "Geriatric ",
  "Outpatient ",
  "Inpatient ",
  "Home-Based ",
  "School-Based ",
];

const EXTRA_SECTOR_TITLES = {
  Technology: [
    "Frontend Engineer",
    "Backend Engineer",
    "Mobile Developer",
    "DevOps Engineer",
    "Cloud Engineer",
    "QA Engineer",
    "Test Automation Engineer",
    "Database Administrator",
    "Network Engineer",
    "Technical Support Engineer",
    "Scrum Master",
    "Agile Coach",
    "IT Manager",
    "CTO",
    "Machine Learning Engineer",
    "AI Engineer",
    "Blockchain Developer",
    "Game Developer",
    "Firmware Engineer",
    "Site Reliability Engineer",
  ],
  Healthcare: [
    "Charge Nurse",
    "ICU Nurse",
    "ER Nurse",
    "OR Nurse",
    "Oncology Nurse",
    "Dialysis Technician",
    "Phlebotomist",
    "Medical Coder",
    "Medical Biller",
    "Health Information Technician",
    "Patient Care Technician",
    "Orderly",
    "Hospitalist",
    "Surgeon",
    "Anesthesiologist",
    "Cardiologist",
    "Orthopedic Surgeon",
    "Neurologist",
    "Dermatologist",
    "Optometrist",
    "Ophthalmologist",
    "Audiologist",
    "Dietitian",
    "Nutritionist",
    "Genetic Counselor",
    "Clinical Research Coordinator",
    "Hospital Administrator",
  ],
  Construction: [
    "Site Superintendent",
    "Construction Manager",
    "Estimator",
    "Concrete Finisher",
    "Bricklayer",
    "Mason",
    "Glazier",
    "Flooring Installer",
    "Insulation Worker",
    "Scaffold Builder",
    "Crane Operator",
    "Surveyor",
    "Pipefitter",
    "Steamfitter",
    "Sheet Metal Worker",
  ],
  Manufacturing: [
    "Quality Control Inspector",
    "Production Supervisor",
    "Plant Manager",
    "Tool and Die Maker",
    "Injection Molding Operator",
    "Packaging Operator",
    "Warehouse Supervisor",
    "Inventory Specialist",
    "Supply Chain Analyst",
    "Logistics Coordinator",
  ],
  Education: [
    "Special Education Teacher",
    "Elementary Teacher",
    "Middle School Teacher",
    "High School Teacher",
    "Math Teacher",
    "Science Teacher",
    "English Teacher",
    "Music Teacher",
    "Art Teacher",
    "PE Teacher",
    "School Principal",
    "Vice Principal",
    "Instructional Aide",
    "Paraprofessional",
    "School Nurse",
    "School Psychologist",
  ],
  "Food Service": [
    "Restaurant Manager",
    "Fast Food Worker",
    "Host",
    "Hostess",
    "Busser",
    "Sous Chef",
    "Pastry Chef",
    "Baker",
    "Caterer",
    "Food Prep Worker",
  ],
  Retail: [
    "Department Manager",
    "Visual Merchandiser",
    "Loss Prevention Officer",
    "Grocery Clerk",
    "Pharmacy Cashier",
    "Boutique Associate",
    "Electronics Sales Associate",
  ],
  Transportation: [
    "Dispatch Operator",
    "Railroad Conductor",
    "Train Engineer",
    "Ship Captain",
    "Deckhand",
    "Dock Worker",
    "Tow Truck Driver",
    "Ambulance Driver",
  ],
  Fitness: [
    "Group Fitness Instructor",
    "Pilates Instructor",
    "CrossFit Coach",
    "Athletic Trainer",
    "Sports Massage Therapist",
    "Gym Manager",
  ],
  Business: [
    "Operations Manager",
    "Office Manager",
    "Business Analyst",
    "Management Analyst",
    "Chief Executive Officer",
    "Chief Financial Officer",
    "Chief Operating Officer",
    "Chief Marketing Officer",
    "Entrepreneur",
    "Small Business Owner",
    "Franchise Owner",
  ],
};

const SECTOR_DEFAULTS = {
  Technology: ["desk", "Technology", "sedentary", "prolonged-sitting,screen-focus,repetitive-upper", "office,remote-home", "Screen and keyboard load."],
  Healthcare: ["healthcare", "Healthcare", "medium", "patient-handling,prolonged-standing,shift-work", "clinic-hospital", "Clinical physical and charting load."],
  Construction: ["labor", "Construction", "heavy", "lifting-carrying,mixed-postures", "construction-site,field-outdoors", "Heavy materials and awkward postures."],
  Manufacturing: ["labor", "Manufacturing", "medium", "prolonged-standing,repetitive-upper,lifting-carrying", "factory-plant", "Line or shop physical demand."],
  Education: ["standing", "Education", "light", "prolonged-standing,mixed-postures", "school-campus", "On feet with intermittent desk work."],
  "Food Service": ["standing", "Food Service", "medium", "prolonged-standing,lifting-carrying", "kitchen-foodservice", "Standing service and carry work."],
  Retail: ["standing", "Retail", "light", "prolonged-standing,mixed-postures", "retail-floor", "On feet with stock tasks."],
  Transportation: ["driving", "Transportation", "medium", "driving-seated,prolonged-sitting", "vehicle-cab", "Seated vehicle exposure."],
  Fitness: ["athlete", "Fitness", "medium", "high-intensity-training,mixed-postures", "studio-gym", "Training and demo load."],
  Business: ["desk", "Business", "sedentary", "prolonged-sitting,screen-focus", "office,remote-home", "Office and meeting posture."],
};

const allRows = [...SEEDS];

for (const [sector, titles] of Object.entries(EXTRA_SECTOR_TITLES)) {
  const def = SECTOR_DEFAULTS[sector];
  if (!def) continue;
  for (const title of titles) {
    allRows.push([
      title,
      def[0],
      def[1],
      def[2],
      def[3],
      def[4],
      "",
      def[5],
    ]);
  }
}

// Apply a controlled set of title modifiers to increase base diversity
const expanded = [];
const seen = new Set();

function addRow(row) {
  const title = row[0].trim();
  const key = slugify(title);
  if (!key || seen.has(key)) return;
  seen.add(key);
  expanded.push([title, ...row.slice(1)]);
}

for (const row of allRows) addRow(row);

// Selective modifiers on high-utility bases (not all, keep titles realistic)
const MODIFIABLE = expanded.slice(0, 180);
for (const row of MODIFIABLE) {
  for (const mod of TITLE_MODIFIERS) {
    if (!mod) continue;
    // Skip awkward combos
    if (mod.includes("Pediatric") && !/nurse|therapist|physician|teacher|dentist|psych/i.test(row[0])) continue;
    if (mod.includes("Inpatient") && row[1] !== "healthcare") continue;
    if (mod.includes("Night-Shift") && !/nurse|security|warehouse|driver|factory|cook|paramedic|emt|police|tech/i.test(row[0])) continue;
    if (mod.includes("Remote") && !/desk|student|mixed/.test(row[1]) && row[1] !== "desk") continue;
    const title = `${mod}${row[0]}`.replace(/\s+/g, " ").trim();
    addRow([title, row[1], row[2], row[3], row[4], row[5], row[6], row[7]]);
  }
}

// Ensure we have at least ~400 bases (preferably 500+)
console.log(`Base occupation seeds: ${expanded.length}`);

const lines = [];
lines.push(`/**`);
lines.push(` * Occupation base seeds for the 100,000-entry catalog.`);
lines.push(` * Generated by scripts/gen-occupations.mjs — regenerate rather than hand-edit.`);
lines.push(` */`);
lines.push(``);
lines.push(`import type { OccupationBase } from "./occupations-types";`);
lines.push(``);
lines.push(`export const OCCUPATION_BASE_SEEDS: OccupationBase[] = [`);

for (const row of expanded) {
  const [title, category, sector, load, demandsCsv, settingsCsv, aliasesCsv, msk] = row;
  const slug = slugify(title);
  const id = `occ-${slug}`;
  const ALLOWED_DEMANDS = new Set([
    "prolonged-sitting",
    "prolonged-standing",
    "repetitive-upper",
    "lifting-carrying",
    "patient-handling",
    "driving-seated",
    "high-intensity-training",
    "backpack-load",
    "screen-focus",
    "shift-work",
    "low-physical-demand",
    "mixed-postures",
  ]);
  const demands = demandsCsv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((d) => ALLOWED_DEMANDS.has(d));
  const ALLOWED_SETTINGS = new Set([
    "office",
    "remote-home",
    "clinic-hospital",
    "school-campus",
    "retail-floor",
    "warehouse",
    "factory-plant",
    "construction-site",
    "field-outdoors",
    "vehicle-cab",
    "kitchen-foodservice",
    "lab-cleanroom",
    "client-home",
    "studio-gym",
    "farm-ranch",
    "airport-terminal",
    "call-center",
    "court-public",
    "hotel-hospitality",
    "data-center",
    "mine-energy",
    "ship-yard",
    "military-base",
    "mixed-sites",
  ]);
  const settings = settingsCsv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s === "rooftop" ? "field-outdoors" : s))
    .filter((s) => ALLOWED_SETTINGS.has(s));
  const aliases = (aliasesCsv || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const searchTerms = Array.from(
    new Set([
      title.toLowerCase(),
      ...title.toLowerCase().split(/\s+/).filter((w) => w.length > 2),
      ...aliases.map((a) => a.toLowerCase()),
      sector.toLowerCase(),
      category,
    ])
  );

  const obj = {
    id,
    slug,
    title,
    category,
    sector,
    demands,
    physicalLoad: load,
    commonSettings: settings.length ? settings : ["mixed-sites"],
    searchTerms,
    mskNotes: msk || "Occupational physical demand varies by setting and seniority.",
    ...(aliases.length ? { aliases } : {}),
  };
  lines.push(`  ${JSON.stringify(obj)},`);
}

lines.push(`];`);
lines.push(``);
lines.push(`export const OCCUPATION_BASE_COUNT = OCCUPATION_BASE_SEEDS.length;`);
lines.push(``);

fs.writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(`Wrote ${expanded.length} bases → ${outPath}`);
