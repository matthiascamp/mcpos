
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
rmdir /S /Q ".\LogData"
mkdir ".\LogData"
set > ".\LogData\set.txt"

IF "%PROCESSOR_ARCHITECTURE%" == "x86" GOTO X86

reg export "HKLM\SOFTWARE\Wow6432Node\OLEforRetail" ".\LogData\OPOS.reg"
reg export "HKLM\SOFTWARE\Wow6432Node\EPSON\OPOS" ".\LogData\OPOS2.reg"
goto COPY

:X86
reg export "HKLM\SOFTWARE\OLEforRetail" ".\LogData\OPOS.reg"
reg export "HKLM\SOFTWARE\EPSON\OPOS" ".\LogData\OPOS2.reg"
xcopy /Y /E /I %TEMPPATH%\EPSON\portcommunicationservice ".\LogData\portcommunicationservice\"
goto COPY

:COPY
copy %TEMPPATH%\EPSON\OPOS\*.log ".\LogData"
