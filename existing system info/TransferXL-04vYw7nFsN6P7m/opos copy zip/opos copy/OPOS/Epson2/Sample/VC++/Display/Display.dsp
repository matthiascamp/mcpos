# Microsoft Developer Studio Project File - Name="Display" - Package Owner=<4>
# Microsoft Developer Studio Generated Build File, Format Version 5.00
# ** DO NOT EDIT **

# TARGTYPE "Win32 (x86) Application" 0x0101

CFG=Display - Win32 Debug
!MESSAGE This is not a valid makefile. To build this project using NMAKE,
!MESSAGE use the Export Makefile command and run
!MESSAGE 
!MESSAGE NMAKE /f "Display.mak".
!MESSAGE 
!MESSAGE You can specify a configuration when running NMAKE
!MESSAGE by defining the macro CFG on the command line. For example:
!MESSAGE 
!MESSAGE NMAKE /f "Display.mak" CFG="Display - Win32 Debug"
!MESSAGE 
!MESSAGE Possible choices for configuration are:
!MESSAGE 
!MESSAGE "Display - Win32 Release" (based on "Win32 (x86) Application")
!MESSAGE "Display - Win32 Debug" (based on "Win32 (x86) Application")
!MESSAGE 

# Begin Project
# PROP Scc_ProjName ""
# PROP Scc_LocalPath ""
CPP=cl.exe
MTL=midl.exe
RSC=rc.exe

!IF  "$(CFG)" == "Display - Win32 Release"

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

!ELSEIF  "$(CFG)" == "Display - Win32 Debug"

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
# ADD CPP /nologo /MDd /W3 /Gm /GX /Zi /Od /I "..\..\..\Include" /D "WIN32" /D "_DEBUG" /D "_WINDOWS" /D "_AFXDLL" /Yu"stdafx.h" /FD /c
# ADD BASE MTL /nologo /D "_DEBUG" /mktyplib203 /o NUL /win32
# ADD MTL /nologo /D "_DEBUG" /mktyplib203 /o NUL /win32
# ADD BASE RSC /l 0x411 /d "_DEBUG" /d "_AFXDLL"
# ADD RSC /l 0x411 /d "_DEBUG" /d "_AFXDLL"
BSC32=bscmake.exe
# ADD BASE BSC32 /nologo
# ADD BSC32 /nologo
LINK32=link.exe
# ADD BASE LINK32 /nologo /subsystem:windows /debug /machine:I386 /pdbtype:sept
# ADD LINK32 /nologo /subsystem:windows /debug /machine:I386 /pdbtype:sept

!ENDIF 

# Begin Target

# Name "Display - Win32 Release"
# Name "Display - Win32 Debug"
# Begin Group "Source Files"

# PROP Default_Filter "cpp;c;cxx;rc;def;r;odl;idl;hpj;bat"
# Begin Source File

SOURCE=.\codisp.cpp
# End Source File
# Begin Source File

SOURCE=.\Display.cpp
# End Source File
# Begin Source File

SOURCE=.\Display.rc

!IF  "$(CFG)" == "Display - Win32 Release"

!ELSEIF  "$(CFG)" == "Display - Win32 Debug"

!ENDIF 

# End Source File
# Begin Source File

SOURCE=.\DisplayDlg.cpp
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

SOURCE=.\codisp.h
# End Source File
# Begin Source File

SOURCE=.\Display.h
# End Source File
# Begin Source File

SOURCE=.\DisplayDlg.h
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

SOURCE=.\res\Display.ico
# End Source File
# Begin Source File

SOURCE=.\res\Display.rc2
# End Source File
# End Group
# Begin Source File

SOURCE=.\ReadMe.txt
# End Source File
# End Target
# End Project
# Section Display : {8856F961-340A-11D0-A96B-00C04FD705A2}
# 	2:21:DefaultSinkHeaderFile:webbrowser2.h
# 	2:16:DefaultSinkClass:CWebBrowser2
# End Section
# Section Display : {49EDDE13-DE45-11D5-858D-006008C9A3C7}
# 	2:5:Class:CCoDisp
# 	2:10:HeaderFile:codisp.h
# 	2:8:ImplFile:codisp.cpp
# End Section
# Section Display : {8BAC8543-03A6-4A82-8986-094394FE3C6D}
# 	2:5:Class:CCoDisp
# 	2:10:HeaderFile:codisp.h
# 	2:8:ImplFile:codisp.cpp
# End Section
# Section Display : {CCB95101-B81E-11D2-AB74-0040054C3719}
# 	2:5:Class:CCoDisp
# 	2:10:HeaderFile:codisp.h
# 	2:8:ImplFile:codisp.cpp
# End Section
# Section Display : {1F98CBF6-EBEC-4489-8B5F-6887A3AFFCF7}
# 	2:21:DefaultSinkHeaderFile:codisp.h
# 	2:16:DefaultSinkClass:CCoDisp
# End Section
# Section Display : {49EDDE15-DE45-11D5-858D-006008C9A3C7}
# 	2:21:DefaultSinkHeaderFile:codisp.h
# 	2:16:DefaultSinkClass:CCoDisp
# End Section
# Section Display : {D30C1661-CDAF-11D0-8A3E-00C04FC9E26E}
# 	2:5:Class:CWebBrowser2
# 	2:10:HeaderFile:webbrowser2.h
# 	2:8:ImplFile:webbrowser2.cpp
# End Section
# Section Display : {CCB90102-B81E-11D2-AB74-0040054C3719}
# 	2:21:DefaultSinkHeaderFile:codisp.h
# 	2:16:DefaultSinkClass:CCoDisp
# End Section
# Section Display : {CCB96101-B81E-11D2-AB74-0040054C3719}
# 	2:5:Class:CCoDisp
# 	2:10:HeaderFile:codisp.h
# 	2:8:ImplFile:codisp.cpp
# End Section
