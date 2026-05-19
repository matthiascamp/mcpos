About EPSON OPOS ADK Sample Programs

EPSON OPOS ADK provides first-time users with the Sample Programs on each device.

In VisualBasic, each Step contains the functionality for the previous steps. 
It is possible to choose one of the Steps according to the user's need. 
In VisualBasic, it is recommended to use programs with the HTML file provided.
When using the HTML file, launch the Sample Programs from the OPOS folder under
start-up menu.
(Or, the HTML file can be found under the installation derectry, \Sample\VB\Index.htm. ) 

In VisualC++, the sample programs other than POSPrinter and LineDisplay are
created with the same specification of the highest step in the VisualBasic.
The sample program of the POSPrinter of VisualC++ is created with the combined
specification of the Step 13 and Step 15 of the VisualBasic.
The sample program of the LineDisplay of VisualC++ is created with the combined
specification of the Step 9, Step 10 and Step 11 of VisualBasic.


[Contents]

(1) Microsoft Visual Basic 5.0/6.0 Sample Program files

 Installed direction : Installed folder\Sample\VB
   Printer\ :PosPrinter Sample Program
   	  	(For the following devices, the sample program corresponding to the Windows Vista environment is not provided.)
   	  	    TM-T88IIIX
   	  	    TM-T88IIIXM
   	Step1\	:Sample Program Step1
   	 |	:Sample Program Step2-Step18
   	Step18\	:Sample Program Step18
   	sPrinter.htm :POSPrinter Sample Program information in HTML
   Display\ :LineDisplay Sample Program
   	  	(For the following devices, the sample program corresponding to the Windows Vista environment is not provided.)
   	  	    DM-D120
   	Step1\	:Sample Program Step1
   	 |	:Sample Program Step2-Step10
   	Step11\	:Sample Program Step11
   	sDisplay.htm :LineDisplay Sample Program information in HTML
   Drawer\ :CashDrawer Sample Program
   	Step1\	:Sample Program Step1
   	 |	:Sample Program Step2-Step3
   	Step4\	:Sample Program Step4
   	sDrawer.htm :CashDrawer Sample Program information in HTML
   Micr\ :Micr Sample Program
   	Step1\	:Sample Program Step1
   	 |	:Sample Program Step2-Step5
   	Step6\	:Sample Program Step6
   	sMicr.htm :Micr Sample Program information in HTML
   MSR\ :MSR Sample Program
   	  	(For MSR, the sample program corresponding to the Windows Vista environment is not provided.)
   	Step1\	:Sample Program Step1
   	 |	:Sample Program Step2-Step3
   	Step4\	:Sample Program Step4
   	sMSR.htm :MSR Sample Program information in HTML
   Keylock\ :Keylock Sample Program
   	  	(For Keylock, the sample program corresponding to the Windows Vista environment is not provided.)
   	Step1\	:Sample Program Step1
   	 |	:Sample Program Step2-Step3
   	Step4\	:Sample Program Step4
   	sKeylock.htm :Keylock Sample Program information in HTML
   HardTotals\ :HardTotals Sample Program
   	  	(For HardTotals, the sample program corresponding to the Windows Vista environment is not provided.)
   	Step1\	:Sample Program Step1
   	 |	:Sample Program Step2-Step5
   	Step6\	:Sample Program Step6
   	sHardTotals.htm :HardTotals Sample Program information in HTML
   CheckScanner\ :CheckScanner Sample Program
   	Step1\	:Sample Program Step1
   	 |	:Sample Program Step2-Step6
   	Step7\	:Sample Program Step7
   	sCScanner.htm :CheckScanner Sample Program information in HTML
   EJRN\ :ElectronicJournal Sample Program
   	Step1\	:Sample Program Step1
   	 |	:Sample Program Step2-Step4
   	Step5\	:Sample Program Step5
   	sEJrn.htm :ElectronicJournal Sample Program information in HTML
   index.htm :Sample Program information in HTML

(2) Microsoft VisualC++ 5.0/6.0 Sample Program files

 Installed direction:Installed folder\Sample\VC++
   Printer\	:PosPrinter Sample Program
   Display\	:LineDisplay Sample Program
   Drawer\	:CashDrawer Sample Program
   Micr\	:Micr Sample Program
   MSR\		:MSR Sample Program
   Keylock\	:Keylock Sample Program
   HTotals\	:HardTotals Sample Program
   ChkScan\	:CheckScanner Sample Program 
   EJRN\	:ElectronicJournal Sample Program 

[Header files]
  The header files for the Sample Programs are stored in the installed Include folder
  when the installer is executed. 
  In the Sample Program, those files are to be used.
  OPOS common header files are basically same as the appendix B of the OPOS
  Application Programmer's Guide.  For details, please refer the OPOS
  Application Programmer's Guide.
  In original header files, there are the definitions of the 
  ResultCodeExtended values used by OPOS controls, and so on.  
  For details, please refer the Application Development Guide.
  
   OPOS.H	OPOS common header file
   OPOSCASH.H	OPOS common header file (for CashDrawer)
   OPOSLOCK.H	OPOS common header file (for Keylock)
   OPOSDISP.H	OPOS common header file (for LineDisplay)
   OPOSMSR.H	OPOS common header file (for MSR)
   OPOSPTR.H	OPOS common header file (for POSPrinter)
   OPOSMICR.H	OPOS common header file (for Micr)
   OPOSTOT.H	OPOS common header file (for HardTotals)
   OPOSChk.H	OPOS common header file (for CheckScanner)
   OPOSEJ.h	OPOS common header file (for ElectronicJournal)
   EPSON.H	Original header file
   EPSNCASH.h	Original header file (for CashDrawer)
   EPSNLOCK.H	Original header file (for Keylock)
   EPSNDISP.H	Original header file (for LineDisplay)
   EPSNMSR.H	Original header file (for MSR)
   EPSNPTR.H	Original header file (for POSPrinter)
   EPSNMICR.H	Original header file (for Micr)
   EPSNTOT.H	Original header file (for HardTotals)
   EPSNCScn.H	Original header file (for CheckScanner)
   EPSNEJ.H	Original header file (for ElectronicJournal)
   OPOS.BAS	Header file for the VisualBasic (Provided by the OPOS Conference)
   OPOSEPSN.BAS   Header file for the VisualBasic (EPSON original)
   OPOSALL.BAS	   Header file for the VisualBasic (Maintenance for before versions)
   

[CAUTION]
  All these sample programs use the logical device name, "Unit1" on opening 
  a device.  Please remember to add the logical device name, "Unit1", to the 
  suitable device by the setup program (SetupPOS), before running 
  these sample programs.
