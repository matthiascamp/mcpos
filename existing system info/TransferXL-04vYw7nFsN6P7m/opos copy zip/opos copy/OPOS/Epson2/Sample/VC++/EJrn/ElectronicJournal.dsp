# Microsoft Developer Studio Project File - Name="ElectronicJournal" - Package Owner=<4>
# Microsoft Developer Studio Generated Build File, Format Version 5.00
# ** DO NOT EDIT **

# TARGTYPE "Win32 (x86) Application" 0x0101

CFG=ElectronicJournal - Win32 Debug
!MESSAGE This is not a valid makefile. To build this project using NMAKE,
!MESSAGE use the Export Makefile command and run
!MESSAGE 
!MESSAGE NMAKE /f "ElectronicJournal.mak".
!MESSAGE 
!MESSAGE You can specify a configuration when running NMAKE
!MESSAGE by defining the macro CFG on the command line. For example:
!MESSAGE 
!MESSAGE NMAKE /f "ElectronicJournal.mak" CFG="ElectronicJournal - Win32 Debug"
!MESSAGE 
!MESSAGE Possible choices for configuration are:
!MESSAGE 
!MESSAGE "ElectronicJournal - Win32 Release" (based on\
 "Win32 (x86) Application")
!MESSAGE "ElectronicJournal - Win32 Debug" (based on "Win32 (x86) Application")
!MESSAGE 

# Begin Project
# PROP Scc_ProjName ""
# PROP Scc_LocalPath ""
CPP=cl.exe
MTL=midl.exe
RSC=rc.exe

!IF  "$(CFG)" == "ElectronicJournal - Win32 Release"

# PROP BASE Use_MFC 6
# PROP BASE Use_Debug_Libraries 0
# PROP BASE Output_Dir "Release"
# PROP BASE Intermediate_Dir "Release"
# PROP BASE Target_Dir ""
# PROP Use_MFC 6
# PROP Use_Debug_Libraries 0
# PROP Output_Dir "Release"
# PROP Intermediate_Dir "Release"
# PROP Target_Dir ""
# ADD BASE CPP /nologo /MD /W3 /GX /O2 /D "WIN32" /D "NDEBUG" /D "_WINDOWS" /D "_AFXDLL" /Yu"stdafx.h" /FD /c
# ADD CPP /nologo /MD /W3 /GX /O2 /I "..\..\..\Include" /D "WIN32" /D "NDEBUG" /D "_WINDOWS" /D "_AFXDLL" /Yu"stdafx.h" /FD /c
# ADD BASE MTL /nologo /D "NDEBUG" /mktyplib203 /o NUL /win32
# ADD MTL /nologo /D "NDEBUG" /mktyplib203 /o NUL /win32
# ADD BASE RSC /l 0x411 /d "NDEBUG" /d "_AFXDLL"
# ADD RSC /l 0x411 /d "NDEBUG" /d "_AFXDLL"
BSC32=bscmake.exe
# ADD BASE BSC32 /nologo
# ADD BSC32 /nologo
LINK32=link.exe
# ADD BASE LINK32 /nologo /subsystem:windows /machine:I386
# ADD LINK32 /nologo /subsystem:windows /machine:I386

!ELSEIF  "$(CFG)" == "ElectronicJournal - Win32 Debug"

# PROP BASE Use_MFC 6
# PROP BASE Use_Debug_Libraries 1
# PROP BASE Output_Dir "Debug"
# PROP BASE Intermediate_Dir "Debug"
# PROP BASE Target_Dir ""
# PROP Use_MFC 6
# PROP Use_Debug_Libraries 1
# PROP Output_Dir "Debug"
# PROP Intermediate_Dir "Debug"
# PROP Target_Dir ""
# ADD BASE CPP /nologo /MDd /W3 /Gm /GX /Zi /Od /D "WIN32" /D "_DEBUG" /D "_WINDOWS" /D "_AFXDLL" /Yu"stdafx.h" /FD /c
# ADD CPP /nologo /MDd /W3 /Gm /GX /Zi /Od /I "..\..\..\Include" /D "WIN32" /D "_DEBUG" /D "_WINDOWS" /D "_AFXDLL" /FR /Yu"stdafx.h" /FD /c
# ADD BASE MTL /nologo /D "_DEBUG" /mktyplib203 /o NUL /win32
# ADD MTL /nologo /D "_DEBUG" /mktyplib203 /o NUL /win32
# ADD BASE RSC /l 0x411 /d "_DEBUG" /d "_AFXDLL"
# ADD RSC /l 0x411 /d "_DEBUG" /d "_AFXDLL"
BSC32=bscmake.exe
# ADD BASE BSC32 /nologo
# ADD BSC32 /nologo
LINK32=link.exe
# ADD BASE LINK32 /nologo /subsystem:windows /debug /machine:I386 /pdbtype:sept
# ADD LINK32 /nologo /subsystem:windows /debug /machine:I386 /pdbtype:sept /libpath:"..\lib"

!ENDIF 

# Begin Target

# Name "ElectronicJournal - Win32 Release"
# Name "ElectronicJournal - Win32 Debug"
# Begin Group "Source Files"

# PROP Default_Filter "cpp;c;cxx;rc;def;r;odl;idl;hpj;bat"
# Begin Source File

SOURCE=.\ElectronicJournal.cpp
# End Source File
# Begin Source File

SOURCE=.\ElectronicJournal.rc

!IF  "$(CFG)" == "ElectronicJournal - Win32 Release"

!ELSEIF  "$(CFG)" == "ElectronicJournal - Win32 Debug"

!ENDIF 

# End Source File
# Begin Source File

SOURCE=.\ElectronicJournalDlg.cpp
# End Source File
# Begin Source File

SOURCE=.\ErrorDialog.cpp
# End Source File
# Begin Source File

SOURCE=.\oposelectronicjournal.cpp
# End Source File
# Begin Source File

SOURCE=.\oposposprinter.cpp
# End Source File
# Begin Source File

SOURCE=.\OutputCompleteDialog.cpp
# End Source File
# Begin Source File

SOURCE=.\OutputCompleteDialog.h
# End Source File
# Begin Source File

SOURCE=.\StdAfx.cpp
# ADD CPP /Yc"stdafx.h"
# End Source File
# Begin Source File

SOURCE=.\webbrowser2.cpp
# End Source File
# Begin Source File

SOURCE=.\XMLView.cpp
# End Source File
# End Group
# Begin Group "Header Files"

# PROP Default_Filter "h;hpp;hxx;hm;inl"
# Begin Source File

SOURCE=.\ElectronicJournal.h
# End Source File
# Begin Source File

SOURCE=.\ElectronicJournalDlg.h
# End Source File
# Begin Source File

SOURCE=.\ErrorDialog.h
# End Source File
# Begin Source File

SOURCE=.\oposelectronicjournal.h
# End Source File
# Begin Source File

SOURCE=.\oposposprinter.h
# End Source File
# Begin Source File

SOURCE=.\Resource.h
# End Source File
# Begin Source File

SOURCE=.\StdAfx.h
# End Source File
# Begin Source File

SOURCE=.\webbrowser2.h
# End Source File
# Begin Source File

SOURCE=.\XMLView.h
# End Source File
# End Group
# Begin Group "Resource Files"

# PROP Default_Filter "ico;cur;bmp;dlg;rc2;rct;bin;cnt;rtf;gif;jpg;jpeg;jpe"
# Begin Source File

SOURCE=.\res\ElectronicJournal.ico
# End Source File
# Begin Source File

SOURCE=.\res\ElectronicJournal.rc2
# End Source File
# End Group
# Begin Source File

SOURCE=.\ReadMe.txt
# End Source File
# End Target
# End Project
# Section ElectronicJournal : {CCB90271-B81E-11D2-AB74-0040054C3719}
# 	2:5:Class:COPOSElectronicJournal
# 	2:10:HeaderFile:oposelectronicjournal.h
# 	2:8:ImplFile:oposelectronicjournal.cpp
# End Section
# Section ElectronicJournal : {CCB98151-B81E-11D2-AB74-0040054C3719}
# 	2:5:Class:COPOSPOSPrinter
# 	2:10:HeaderFile:oposposprinter.h
# 	2:8:ImplFile:oposposprinter.cpp
# End Section
# Section ElectronicJournal : {D30C1661-CDAF-11D0-8A3E-00C04FC9E26E}
# 	2:5:Class:CWebBrowser21
# 	2:10:HeaderFile:webbrowser3.h
# 	2:8:ImplFile:webbrowser3.cpp
# End Section
# Section ElectronicJournal : {CCB90152-B81E-11D2-AB74-0040054C3719}
# 	2:21:DefaultSinkHeaderFile:oposposprinter.h
# 	2:16:DefaultSinkClass:COPOSPOSPrinter
# End Section
# Section ElectronicJournal : {8856F961-340A-11D0-A96B-00C04FD705A2}
# 	2:21:DefaultSinkHeaderFile:webbrowser3.h
# 	2:16:DefaultSinkClass:CWebBrowser21
# End Section
# Section ElectronicJournal : {CCB95151-B81E-11D2-AB74-0040054C3719}
# 	2:5:Class:COPOSPOSPrinter
# 	2:10:HeaderFile:oposposprinter.h
# 	2:8:ImplFile:oposposprinter.cpp
# End Section
# Section ElectronicJournal : {CCB91271-B81E-11D2-AB74-0040054C3719}
# 	2:5:Class:COPOSElectronicJournal
# 	2:10:HeaderFile:oposelectronicjournal.h
# 	2:8:ImplFile:oposelectronicjournal.cpp
# End Section
# Section ElectronicJournal : {CCB90272-B81E-11D2-AB74-0040054C3719}
# 	2:21:DefaultSinkHeaderFile:oposelectronicjournal.h
# 	2:16:DefaultSinkClass:COPOSElectronicJournal
# End Section
