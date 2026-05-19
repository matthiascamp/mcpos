VERSION 5.00
Object = "{CCB90150-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSPOSPrinter.ocx"
Object = "{CCB90270-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSElectronicJournal.ocx"
Begin VB.Form Form3 
   Caption         =   "Step 3 Extract Content to a Separate file and print from file."
   ClientHeight    =   7755
   ClientLeft      =   60
   ClientTop       =   450
   ClientWidth     =   6480
   LinkTopic       =   "Form3"
   ScaleHeight     =   7755
   ScaleWidth      =   6480
   StartUpPosition =   3  'Windows Default
   Begin VB.Frame FrameElectronicJournal 
      Caption         =   "Electronic Journal"
      Height          =   5175
      Left            =   360
      TabIndex        =   3
      Top             =   1440
      Width           =   5895
      Begin VB.Frame Frame2 
         Height          =   855
         Left            =   120
         TabIndex        =   18
         Top             =   4200
         Width           =   5655
         Begin VB.CommandButton FileChooseButton 
            Caption         =   "..."
            Height          =   375
            Left            =   5160
            TabIndex        =   21
            Top             =   240
            Width           =   375
         End
         Begin VB.TextBox PrintFileNameEdit 
            Height          =   375
            Left            =   2640
            TabIndex        =   20
            Text            =   "ElectronicJournalFile1.bin"
            Top             =   240
            Width           =   2415
         End
         Begin VB.CommandButton PrintContentFileButton 
            Caption         =   "Print File"
            Height          =   375
            Left            =   120
            TabIndex        =   19
            Top             =   240
            Width           =   2175
         End
      End
      Begin VB.CheckBox AsyncModeCheck 
         Caption         =   "Async Mode"
         Height          =   255
         Left            =   2640
         TabIndex        =   13
         Top             =   600
         Width           =   2655
      End
      Begin VB.CheckBox DataEventEnabledCheck 
         Caption         =   "DataEvent Enabled"
         Height          =   255
         Left            =   2640
         TabIndex        =   12
         Top             =   240
         Width           =   2655
      End
      Begin VB.Frame Frame3 
         Height          =   2535
         Left            =   120
         TabIndex        =   8
         Top             =   1680
         Width           =   5655
         Begin VB.CommandButton QueryContentButton 
            Caption         =   "QueryContent"
            Height          =   375
            Left            =   120
            TabIndex        =   17
            Top             =   1080
            Width           =   2175
         End
         Begin VB.TextBox FileNameEdit 
            Height          =   375
            Left            =   2640
            TabIndex        =   16
            Text            =   "ElectronicJournalFile1.bin"
            Top             =   360
            Width           =   2415
         End
         Begin VB.TextBox StartMarkerEdit 
            Height          =   375
            Left            =   2640
            TabIndex        =   14
            Text            =   "MarkerByStep1"
            Top             =   1200
            Width           =   2415
         End
         Begin VB.TextBox EndMarkerEdit 
            Height          =   375
            Left            =   2640
            TabIndex        =   9
            Text            =   "MarkerByStep3"
            Top             =   2040
            Width           =   2415
         End
         Begin VB.Label Label3 
            Caption         =   "File Name"
            Height          =   255
            Left            =   2520
            TabIndex        =   15
            Top             =   120
            Width           =   1095
         End
         Begin VB.Label Label2 
            Caption         =   "End Marker"
            Height          =   255
            Left            =   2520
            TabIndex        =   11
            Top             =   1800
            Width           =   1335
         End
         Begin VB.Label Label1 
            Caption         =   "Start Marker"
            Height          =   255
            Left            =   2520
            TabIndex        =   10
            Top             =   960
            Width           =   1455
         End
      End
      Begin VB.TextBox MarkerEdit 
         Height          =   375
         Left            =   2760
         TabIndex        =   6
         Text            =   "MarkerByStep3"
         Top             =   1080
         Width           =   2415
      End
      Begin VB.CommandButton AddMarkerButton 
         Caption         =   "AddMarker"
         Height          =   375
         Left            =   240
         TabIndex        =   5
         Top             =   1080
         Width           =   2295
      End
      Begin VB.Frame Frame1 
         Height          =   855
         Left            =   120
         TabIndex        =   7
         Top             =   840
         Width           =   5655
      End
      Begin VB.CheckBox StorageEnabledCheck 
         Caption         =   "StorageEnabled"
         Height          =   255
         Left            =   120
         TabIndex        =   4
         Top             =   360
         Width           =   2175
      End
   End
   Begin VB.CommandButton PrintButton 
      Caption         =   "Print Receipt"
      Height          =   375
      Left            =   1560
      TabIndex        =   0
      Top             =   720
      Width           =   3135
   End
   Begin VB.Frame Frame11 
      Caption         =   "Receipt Printer"
      Height          =   975
      Left            =   360
      TabIndex        =   2
      Top             =   360
      Width           =   5895
   End
   Begin VB.CommandButton ExitButton 
      Caption         =   "Close"
      Height          =   375
      Left            =   4560
      TabIndex        =   1
      Top             =   6840
      Width           =   1455
   End
   Begin OposElectronicJournal_CCOCtl.OPOSElectronicJournal OPOSElectronicJournal1 
      Left            =   1320
      OleObjectBlob   =   "Form3.frx":0000
      Top             =   6840
   End
   Begin OposPOSPrinter_CCOCtl.OPOSPOSPrinter OPOSPOSPrinter1 
      Left            =   600
      OleObjectBlob   =   "Form3.frx":0024
      Top             =   6840
   End
End
Attribute VB_Name = "Form3"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False

' Struct for FileDialog
Private Type OpenFileName
        lStructSize As Long
        hwndOwner As Long
        hInstance As Long
        lpstrFilter As String
        lpstrCustomFilter As String
        nMaxCustFilter As Long
        nFilterIndex As Long
        lpstrFile As String
        nMaxFile As Long
        lpstrFileTitle As String
        nMaxFileTitle As Long
        lpstrInitialDir As String
        lpstrTitle As String
        flags As Long
        nFileOffset As Integer
        nFileExtension As Integer
        lpstrDefExt As String
        lCustData As Long
        lpfnHook As Long
        lpTemplateName As String
End Type

' File dialog Function
Private Declare Function GetOpenFileName Lib "comdlg32.dll" Alias "GetOpenFileNameA" (pOpenfilename As OpenFileName) As Long


Private Sub AddMarkerButton_Click()
    
    With OPOSElectronicJournal1
        ' Add marker to storage
        .AddMarker MarkerEdit.Text
        
        ' Notify AddMarker method error
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Failed to Add Marker." + vbCrLf + "ResultCode = " + CStr(.ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(.ResultCodeExtended)
        End If
    End With
    
End Sub


Private Sub AsyncModeCheck_Click()

    ' Change print and query process with Asynchronous or Sysnchronous.
    With OPOSElectronicJournal1
        .AsyncMode = AsyncModeCheck.Value
        
        Dim CheckBoxValue As Integer
        
        If .AsyncMode Then
            CheckBoxValue = 1
        Else
            CheckBoxValue = 0
        End If
        
        AsyncModeCheck.Value = CheckBoxValue

    End With

End Sub

Private Sub DataEventEnabledCheck_Click()

    ' Handling DataEvent for Asynchronous QueryContent Method.
    With OPOSElectronicJournal1
        .DataEventEnabled = DataEventEnabledCheck.Value
        
        Dim CheckBoxValue As Integer
        
        If .DataEventEnabled Then
            CheckBoxValue = 1
        Else
            CheckBoxValue = 0
        End If
        
        DataEventEnabledCheck.Value = CheckBoxValue

    End With

End Sub

Private Sub ExitButton_Click()

    Unload Me

End Sub

Private Sub FileChooseButton_Click()
    
    Dim typFileName As OpenFileName
    
    With typFileName
        .lStructSize = Len(typFileName)
        .hwndOwner = lngHWnd
        .hInstance = App.hInstance
        .lpstrFilter = "*.*"
        .nFilterIndex = 1
        .lpstrFile = String(256, Chr(0))
        .nMaxFile = 256
        .nMaxFileTitle = 256
        .lpstrFileTitle = String(256, Chr(0))
        .lpstrInitialDir = "."
        .lpstrTitle = "Open File"
        .flags = &H1000 'OFN_FILEMUSTEXIST
    End With
    
    If GetOpenFileName(typFileName) <> 0 Then
        PrintFileNameEdit.Text = typFileName.lpstrFile
    End If
    
End Sub

Private Sub Form_Load()

    With OPOSPOSPrinter1
        .Open "Unit1"
        'Check whether the device is succeed to open, or not
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to open the POSPrinter device."
            GoTo LoadErrorPtr
        End If
        
        .ClaimDevice 1000
        'Check whether the device is claim to use, or not
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to claim the POSPrinter device."
            GoTo LoadErrorPtr
        End If

        If .CapPowerReporting <> OPOS_PR_NONE Then
            .PowerNotify = OPOS_PN_ENABLED
        End If

       .DeviceEnabled = True
        'Check whether the device is enable to use, or not
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Disable to use the POSPrinter device."
            GoTo LoadErrorPtr
        End If
        
    End With
        
    With OPOSElectronicJournal1
        
        .Open "Unit1"
        'Check whether the device is succeed to open, or not
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to open the ElectronicJournal device."
            GoTo LoadErrorEJ
            Exit Sub
        End If
        
        .ClaimDevice 1000
        'Check whether the device is claim to use, or not
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to claim the ElectronicJournal device."
            GoTo LoadErrorEJ
        End If

        .DeviceEnabled = True
        'Check whether the device is enable to use, or not
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Disable to use the ElectronicJournal device."
            GoTo LoadErrorEJ
            Exit Sub
        End If
         
        .StorageEnabled = True
        'Check whether the device is store enabled to use, or not
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to storage enabled."
            GoTo LoadErrorEJ
            Exit Sub
        End If

        If .StorageEnabled Then
            StorageEnabledCheck.Value = 1
        Else
            GoTo LoadErrorEJ
            Exit Sub
        End If
    
    End With
    
    FileNameEdit.Text = App.Path + "\" + FileNameEdit.Text
    PrintFileNameEdit.Text = App.Path + "\" + PrintFileNameEdit.Text

    PrintButton.Enabled = True
    
Exit Sub

LoadErrorPtr:
    'Disable POSPrinter Control
    PrintButton.Enabled = False
            
    ExitButton.Enabled = True
    
LoadErrorEJ:
    'Disable ElectronicJournal Control
    StorageEnabledCheck.Enabled = False
    DataEventEnabledCheck.Enabled = False
    AsyncModeCheck.Enabled = False
    AddMarkerButton.Enabled = False
    MarkerEdit.Enabled = False
    PrintContentFileButton.Enabled = False
    FileNameEdit.Enabled = False
    PrintFileNameEdit.Enabled = False
    StartMarkerEdit.Enabled = False
    EndMarkerEdit.Enabled = False
    FileChooseButton.Enabled = False
    QueryContentButton.Enabled = False
    
    ExitButton.Enabled = True

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSPOSPrinter1
        
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    
    End With
        
    With OPOSElectronicJournal1
        
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    
    End With

End Sub



Private Sub OPOSElectronicJournal1_DataEvent(ByVal Status As Long)
    
    MsgBox "Complete Querying Content: Status = " + CStr(Status)
    
    DataEventEnabledCheck.Value = OPOSElectronicJournal1.DataEventEnabled
    
End Sub


Private Sub OPOSElectronicJournal1_OutputCompleteEvent(ByVal OutputID As Long)

    MsgBox "Complete Printing Content File : ID = " + CStr(OutputID), vbOKOnly, "EJSample_Step3"

End Sub

Private Sub OPOSElectronicJournal1_ErrorEvent(ByVal ResultCode As Long, ByVal ResultCodeExtended As Long, ByVal ErrorLocus As Long, pErrorResponse As Long)

    ' Handling error event to asynchronous print/query process.
    Dim DialogMessage As String
    Dim DialogResult As Integer
    
    If ErrorLocus = OPOS_EL_OUTPUT Then
        ' Error from asynchronous print.
        DialogMessage = "Output Error" + vbCrLf + vbCrLf + "ResultCode = " + CStr(ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(ResultCodeExtended)
        DialogResult = MsgBox(DialogMessage, vbRetryCancel, "EJSample_Step3")
        
        If DialogResult = vbRetry Then
            ' Retry asynchronous print
            pErrorResponse = OPOS_ER_RETRY
        ElseIf DialogResult = vbCancel Then
            ' Clear asynchronous print
            pErrorResponse = OPOS_ER_CLEAR
        End If
        
    ElseIf ErrorLocus = OPOS_EL_INPUT_DATA Then
        DialogMessage = "InputData Error" + vbCrLf + vbCrLf + "ResultCode = " + CStr(ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(ResultCodeExtended)
        DialogResult = MsgBox(DialogMessage, vbOKCancel, "EJSample_Step3")
        
        If DialogResult = vbOK Then
            ' Continue to receive input events.
            pErrorResponse = OPOS_ER_CONTINUEINPUT
        ElseIf DialogResult = vbCancel Then
            ' Clear all input events.
            pErrorResponse = OPOS_ER_CLEAR
        End If
    
    ElseIf ErrorLocus = OPOS_EL_INPUT Then
        DialogMessage = "Input Error" + vbCrLf + vbCrLf + "ResultCode = " + CStr(ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(ResultCodeExtended)
        DialogResult = MsgBox(DialogMessage, vbOK, "EJSample_Step3")
        
    End If
    
    
        
End Sub

Private Sub PrintButton_Click()

    ' Print receipt by POSPrinter.
    ' For detail refer POSPrinter SampleProgram.
    Dim rcSpacing As Long
    Dim rcHeight As Long
    Dim ESC As String * 1
    Dim fDate As String

    MousePointer = vbHourglass
    ESC = Chr(&H1B)
    fDate = Format(Now, "mmmm dd, yyyy  AM/PM h:mm")
    
    With OPOSPOSPrinter1
        rcSpacing = .RecLineSpacing
        rcHeight = .RecLineHeight
        .TransactionPrint PTR_S_RECEIPT, PTR_TP_TRANSACTION

        .RotatePrint PTR_S_RECEIPT, PTR_RP_LEFT90
        
        .PrintNormal PTR_S_RECEIPT, ESC + "|4C" + ESC + "|bC" + "   Receipt     "
        .PrintNormal PTR_S_RECEIPT, ESC + "|3C" + ESC + "|2uC" + "       Mr. Brawn" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|2uC" + "                                                  " + vbCrLf + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|2uC" + ESC + "|3C" + "        Total payment              $" + ESC + "|4C" + "21.00  " + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|1C" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, fDate + " Received" + vbCrLf + vbCrLf
        .RecLineHeight = 24
        .RecLineSpacing = .RecLineHeight
        .PrintNormal PTR_S_RECEIPT, ESC + "|uC" + " Details               " + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|1C" + "                          " + ESC + "|2C" + "OPOS Store" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|uC" + " Tax excluded    $20.00" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|1C" + "                          " + ESC + "|bC" + "Zip code 999-9999" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|uC" + " Tax(5%)        $1.00" + ESC + "|N" + "    Phone#(9999)99-9998" + vbCrLf

        .RotatePrint PTR_S_RECEIPT, PTR_RP_NORMAL

        .PrintNormal PTR_S_RECEIPT, ESC + "|fP"

        .TransactionPrint PTR_S_RECEIPT, PTR_TP_NORMAL
        
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Failed to Receipt print. " + vbCrLf + "ResultCode = " + CStr(.ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(.ResultCodeExtended)
        End If

        .RecLineSpacing = rcSpacing
        .RecLineHeight = rcHeight
    End With

    MousePointer = vbDefault

End Sub



Private Sub PrintContentFileButton_Click()

    ' Print ElectronicJournal file that extracted storage.
    With OPOSElectronicJournal1
        .PrintContentFile PrintFileNameEdit.Text

        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Failed to Print ElectronicJournalFile. " + vbCrLf + "ResultCode = " + CStr(.ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(.ResultCodeExtended)
        End If
    End With

End Sub

Private Sub QueryContentButton_Click()
    
    ' Extract storage content by from marker to marker.
    With OPOSElectronicJournal1
        .QueryContent FileNameEdit.Text, StartMarkerEdit.Text, EndMarkerEdit.Text

        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Failed to Create ElectronicJournalFile. " + vbCrLf + "ResultCode = " + CStr(.ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(.ResultCodeExtended)
        End If
    End With

End Sub

Private Sub StorageEnabledCheck_Click()

    ' ElectronicJournal storage Start / Stop
    With OPOSElectronicJournal1
        .StorageEnabled = StorageEnabledCheck.Value

        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Failed to Storage Ready. " + vbCrLf + "ResultCode = " + CStr(.ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(.ResultCodeExtended)
        End If
        
        Dim CheckBoxValue As Integer
        
        If .StorageEnabled Then
            CheckBoxValue = 1
        Else
            CheckBoxValue = 0
        End If
        
        StorageEnabledCheck.Value = CheckBoxValue
        
    End With
End Sub
