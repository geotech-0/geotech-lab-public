***Static load tests on three different pile types in very dense sand at Amaliahaven***

# General Information
Author: Kevin Duffy (Corresponding Author)
https://orcid.org/0000-0002-7918-2171
Geo-Engineering Section, Department of Civil Engineering & Geosciences, Delft University of Technology
k.duffy@tudelft.nl

Co-Authors: Ken Gavin (TU Delft), Mandy Korff (TU Delft/Deltares), Dirk de Lange (TU Delft/Deltares), Alfred Roubos (Port of Rotterdam)

- **Date of data collection:** October 2019 - January 2020
- **Location of data collection**: Amaliahaven, Port of Rotterdam, The Netherlands
- **Funding source**: This research is part of the InPAD project, a project funded through Het Topconsortium voor 
Kennis en Innovatie (TKI) Deltatechnologie and seven industry partners: Delft University of Technology,
Deltares, Dutch Association of Piling Contractors (NVAF), Dutch Ministry of Infrastructure and Water Management, 
Fugro, Port of Rotterdam Authority, and the Municipality of Rotterdam.


# Sharing/Access Information
License: CC BY 4.0 Attribution 4.0 International (https://creativecommons.org/licenses/by/4.0/)
By exercising the Licensed Rights (defined below), You accept and agree to be bound by the terms and conditions of 
this Creative Commons Attribution 4.0 International Public License ("Public License"). To the extent this Public 
License may be interpreted as a contract, You are granted the Licensed Rights in consideration of Your acceptance 
of these terms and conditions, and the Licensor grants You such rights in consideration of benefits the Licensor 
receives from making the Licensed Material available under these terms and conditions.

This research has been published in the following publications: 

- Duffy, K.J., 2025, Axial capacity of piles in sand: A field investigation using distributed fibre optic sensing. 
[Doctoral dissertation, Delft University of Technology]. (to be published)
- Duffy, K.J., Gavin, K.G., Korff, M., De Lange, D.A., and Roubos, A.A. 2024. Influence of the installation method 
on the axial capacity of piles in very dense sand. Journal of Geotechnical and Geoenvironmental Engineering, 
150(6): 04024043. doi:10.1061/JGGEFK/GTENG-12026.

The data is also available on the national pile test database NCS 7201: www.nen.nl/certificatie-en-keurmerken-funderingspalen

# Data & File Overview
**Note:** the naming system of the piles is different in the publications Duffy (2024) and Duffy et al. (2024). Refer to 
`publication_name` in `pile-details.csv` for further intormation. 

## installation
Contains data collected during the installation of the six piles, including from the drilling rig. Samples collected from 
grout outflowing at the ground surface during installation of the screw injection piles are in the files named `Uitkomende grout_PILE ID.xlsx`.

## load-test
The unprocessed results from the load test on each individual pile. Consists of the following files: 
- `PILEID_datums.csv`: Times of each loading step. Used to correlate time series data in other files to what's going on during the test itself
- `PILEID_topside.csv`: Any measurements made above ground. 
- `PILEID_temperature.csv`: Gives temperature measured by Raman sensors in degrees Celsius (for driven precast piles only). Two measurements were 
made before installation with the pile on the ground surface. One at the start of testing.
- `PILEID_load-distrib.csv`: Interpreted force measurements (in kN) after data processing and conversion using the pile stiffness.
- Strain measurements are given in microstrain (compression = negative number). 

## photos
Self-explanatory.

## scripts
Folder containing several Pythons scripts to scrape and process the data. 

`core.py` acts as the main engine of the analysis whereby all data is scraped and processed into the `piledat` class.
## site-investigation
All CPTs are provided in the Geotechnical Exchange Format (`*.GEF`). A parser for these files is available from the CPyT package, 
developed by the corresponding author (https://github.com/triaduct/cpyt)

# Methodological information
All methodological information is provided on the national pile test database NCS 7201: www.nen.nl/certificatie-en-keurmerken-funderingspalen
or via the following references:
 - 	Duffy, K. J. (2020). Report on pile test results at Maasvlakte II: Driven Precast Piles.
	TU Delft. Delft, The Netherlands. https://research.tudelft.nl/en/publications/
	report-on-pile-test-results-at-maasvlakte-ii-driven-precast-piles
 -	Duffy, K. J. (2021a). Report on pile test results at Maasvlakte II: Screw injection piles.
	TU Delft. Delft, The Netherlands. https://research.tudelft.nl/en/publications/
	report-on-pile-test-results-at-maasvlakte-ii-screw-injection-pile
 - 	Duffy, K. J. (2021b). Report on pile test results at Maasvlakte II: Vibro piles. TU
	Delft. Delft, The Netherlands. https://research.tudelft.nl/en/publications/reporton-
	pile-test-results-at-maasvlakte-ii-vibro-piles
Tests were performed with the guidance of the Dutch committee for pile testing NPR7201 and the eponymous standard (2020 edition).


