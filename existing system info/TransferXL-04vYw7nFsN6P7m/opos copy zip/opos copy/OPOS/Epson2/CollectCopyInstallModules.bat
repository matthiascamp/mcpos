
echo off

VER|FIND "[Version 5.">NUL
IF %ERRORLEVEL% EQU 0 GOTO XP_PATH
VER|FIND "[Version 6.">NUL
IF %ERRORLEVEL% EQU 0 GOTO VISTA_PATH

:XP_PATH
set TEMPPATH="%ALLUSERSPROFILE%\Application Data"
goto COMMAND

:VISTA_PATH
set TEMPPATH="%ALLUSERSPROFILE%"
goto COMMAND

:COMMAND
rmdir /S /Q ".\EpsonCopyInstallModules"
mkdir ".\EpsonCopyInstallModules"

IF "%PROCESSOR_ARCHITECTURE%" == "x86" GOTO X86

reg export "HKLM\SOFTWARE\Wow6432Node\OLEforRetail" ".\EpsonCopyInstallModules\OPOS.reg"
goto COPY

:X86
reg export "HKLM\SOFTWARE\OLEforRetail" ".\EpsonCopyInstallModules\OPOS.reg"
goto COPY

:COPY
copy %TEMPPATH%\EPSON\portcommunicationservice\pcs.properties .\EpsonCopyInstallModules\
copy %windir%\setup.iss .\EpsonCopyInstallModules\
