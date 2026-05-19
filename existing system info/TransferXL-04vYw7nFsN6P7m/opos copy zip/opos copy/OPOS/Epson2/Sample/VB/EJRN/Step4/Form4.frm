VERSION 5.00
Object = "{CCB90150-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSPOSPrinter.ocx"
Object = "{CCB90270-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSElectronicJournal.ocx"
Begin VB.Form Form4 
   Caption         =   "Step 4 Using Suspend Mode."
   ClientHeight    =   7785
   ClientLeft      =   60
   ClientTop       =   345
   ClientWidth     =   10905
   LinkTopic       =   "Form4"
   ScaleHeight     =   7785
   ScaleWidth      =   10905
   StartUpPosition =   3  'Windows Default
   Begin VB.Frame FrameElectronicJournal 
      Caption         =   "Electronic Journal"
      Height          =   5175
      Left            =   360
      TabIndex        =   3
      Top             =   1440
      Width           =   10215
      Begin VB.CommandButton CancelPrintContentButton 
         Caption         =   "Cancel Print"
         Height          =   375
         Left            =   6720
         TabIndex        =   24
         Top             =   4320
         Width           =   2655
      End
      Begin VB.CommandButton ResumePrintContentButton 
         Caption         =   "Resume Print"
         Height          =   375
         Left            =   3720
         TabIndex        =   23
         Top             =   4320
         Width           =   2655
      End
      Begin VB.CommandButton SuspendPrintContentButton 
         Caption         =   "Suspend Print"
         Height          =   375
         Left            =   720
         TabIndex        =   22
         Top             =   4320
         Width           =   2655
      End
      Begin VB.Frame Frame2 
         Height          =   1575
         Left            =   360
         TabIndex        =   18
         Top             =   2520
         Width           =   4455
         Begin VB.CommandButton FileChooseButton 
            Caption         =   "..."
            Height          =   375
            Left            =   3720
            TabIndex        =   21
            Top             =   840
            Width           =   375
         End
         Begin VB.TextBox PrintFileNameEdit 
            Height          =   375
            Left            =   600
            TabIndex        =   20
            Text            =   "ElectronicJournalFile1.bin"
            Top             =   840
            Width           =   3015
         End
         Begin VB.CommandButton PrintContentFileButton 
            Caption         =   "Print File"
            Height          =   375
            Left            =   1080
            TabIndex        =   19
            Top             =   360
            Width           =   2295
         End
      End
      Begin VB.CheckBox AsyncModeCheck 
         Caption         =   "Async Mode"
         Height          =   255
         Left            =   4920
         TabIndex        =   13
         Top             =   600
         Width           =   2655
      End
      Begin VB.CheckBox DataEventEnabledCheck 
         Caption         =   "DataEvent Enabled"
         Height          =   255
         Left            =   4920
         TabIndex        =   12
         Top             =   240
         Width           =   2655
      End
      Begin VB.Frame Frame3 
         Height          =   3135
         Left            =   5040
         TabIndex        =   8
         Top             =   960
         Width           =   4815
         Begin VB.CommandButton QueryContentButton 
            Caption         =   "QueryContent"
            Height          =   375
            Left            =   1440
            TabIndex        =   17
            Top             =   240
            Width           =   2175
         End
         Begin VB.TextBox FileNameEdit 
            Height          =   375
            Left            =   240
            TabIndex        =   16
            Text            =   "ElectronicJournalFile1.bin"
            Top             =   840
            Width           =   4215
         End
         Begin VB.TextBox StartMarkerEdit 
            Height          =   375
            Left            =   240
            TabIndex        =   14
            Text            =   "MarkerByStep1"
            Top             =   1680
            Width           =   4215
         End
         Begin VB.TextBox EndMarkerEdit 
            Height          =   375
            Left            =   240
            TabIndex        =   9
            Text            =   "MarkerByStep4"
            Top             =   2520
            Width           =   4215
         End
         Begin VB.Label Label3 
            Caption         =   "File Name"
            Height          =   255
            Left            =   240
            TabIndex        =   15
            Top             =   600
            Width           =   1095
         End
         Begin VB.Label Label2 
            Caption         =   "End Marker"
            Height          =   255
            Left            =   240
            TabIndex        =   11
            Top             =   2280
            Width           =   1335
         End
         Begin VB.Label Label1 
            Caption         =   "Start Marker"
            Height          =   255
            Left            =   240
            TabIndex        =   10
            Top             =   1440
            Width           =   1455
         End
      End
      Begin VB.TextBox MarkerEdit 
         Height          =   375
         Left            =   1080
         TabIndex        =   6
         Text            =   "MarkerByStep4"
         Top             =   1800
         Width           =   3015
      End
      Begin VB.CommandButton AddMarkerButton 
         Caption         =   "AddMarker"
         Height          =   375
         Left            =   1440
         TabIndex        =   5
         Top             =   1320
         Width           =   2295
      End
      Begin VB.Frame Frame1 
         Height          =   1575
         Left            =   360
         TabIndex        =   7
         Top             =   960
         Width           =   4455
      End
      Begin VB.CheckBox StorageEnabledCheck 
         Caption         =   "StorageEnabled"
         Height          =   255
         Left            =   2400
         TabIndex        =   4
         Top             =   360
         Width           =   2175
      End
   End
   Begin VB.CommandButton PrintButton 
      Caption         =   "Print Receipt"
      Height          =   375
      Left            =   3840
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
      Width           =   10215
   End
   Begin VB.CommandButton ExitButton 
      Caption         =   "Close"
      Height          =   375
      Left            =   9120
      TabIndex        =   1
      Top             =   6840
      Width           =   1455
   End
   Begin OposElectronicJournal_CCOCtl.OPOSElectronicJournal OPOSElectronicJournal1 
      Left            =   1440
      OleObjectBlob   =   "Form4.frx":0000
      Top             =   6840
   End
   Begin OposPOSPrinter_CCOCtl.OPOSPOSPrinter OPOSPOSPrinter1 
      Left            =   840
      OleObjectBlob   =   "Form4.frx":0024
      Top             =   6840
   End
End
Attribute VB_Name = "Form4"
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

' ErrorEvet recovery type
Public ErrorRecovery As Integer

' ElectonicJournal Asynchronous Printing
Public EJAsyncPrinting As Boolean
' NearEnd detection
Public NearEndDetect As Boolean


Private Sub AddMarkerButton_Click()
    
    With OPOSElectronicJournal1
        ' Add marker to storage
        .AddMarker MarkerEdit.Text
        
        ' Notify AddMarker method error.
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

Private Sub CancelPrintContentButton_Click()
    
    ' Cancel suspended print process.
    With OPOSElectronicJournal1
        .CancelPrintContent
        
        If .ResultCode = OPOS_SUCCESS Then
            EJAsyncPrinting = False
            ' SuspendMode end.
            CancelPrintContentButton.Enabled = False
            ResumePrintContentButton.Enabled = False
        
        Else
        
            MsgBox "Failed to Cancel Print. " + vbCrLf + "ResultCode = " + CStr(.ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(.ResultCodeExtended)
        End If
        
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
    
    EJAsyncPrinting = False
    NearEndDetect = False

    PrintButton.Enabled = True
    
    SuspendPrintContentButton.Enabled = False
    ResumePrintContentButton.Enabled = False
    CancelPrintContentButton.Enabled = False
    
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
    SuspendPrintContentButton.Enabled = False
    ResumePrintContentButton.Enabled = False
    CancelPrintContentButton.Enabled = False
    
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

Private Sub OPOSElectronicJournal1_ErrorEvent(ByVal ResultCode As Long, ByVal ResultCodeExtended As Long, ByVal ErrorLocus As Long, pErrorResponse As Long)

    ' Handling error event to asynchronous print/query process.
    Dim DialogMessage As String
    Dim DialogResult As Integer
    
    ' Error from asynchronous print process.
    If ErrorLocus = OPOS_EL_OUTPUT Then
        DialogMessage = "Output Error" + vbCrLf + vbCrLf + "ResultCode = " + CStr(ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(ResultCodeExtended)
        ErrorRecovery = 0
        
        ErrorEventDlg.ErrorMessageLabel.Caption = DialogMessage
        
        ErrorEventDlg.ErrorSuspendButton.Caption = "Suspend Process"
        ErrorEventDlg.ErrorRetryButton.Caption = "Retry Process"
        ErrorEventDlg.ErrorCancelButton.Caption = "Cancel Process"
        ErrorEventDlg.ErrorSuspendButton.Enabled = True
        ErrorEventDlg.ErrorRetryButton.Enabled = True
        ErrorEventDlg.ErrorCancelButton.Enabled = True
        
        ErrorEventDlg.Show 1, Me
        
        If ErrorRecovery = 0 Then
            ' Cancel asynchronous print
            pErrorResponse = OPOS_ER_CLEAR
            SuspendPrintContentButton.Enabled = False
            EJAsyncPrinting = False
        
        ElseIf ErrorRecovery = 1 Then
            ' Retry asynchronous print
            pErrorResponse = OPOS_ER_RETRY
            SuspendPrintContentButton.Enabled = True
            EJAsyncPrinting = True
        
        ElseIf ErrorRecovery = 2 Then
            ' Suspend asynchronous print
            OPOSElectronicJournal1.SuspendPrintContent
            
            pErrorResponse = OPOS_ER_RETRY
            EJAsyncPrinting = False
            
        End If

    ' Error from asynchronous query process.
    ElseIf ErrorLocus = OPOS_EL_INPUT_DATA Then
        DialogMessage = "InputData Error" + vbCrLf + vbCrLf + "ResultCode = " + CStr(ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(ResultCodeExtended)
        ErrorEventDlg.ErrorMessageLabel.Caption = DialogMessage

        ErrorEventDlg.ErrorSuspendButton.Caption = "Suspend Process"
        ErrorEventDlg.ErrorRetryButton.Caption = "Continue Input"
        ErrorEventDlg.ErrorCancelButton.Caption = "Clear"
        ErrorEventDlg.ErrorSuspendButton.Enabled = False
        ErrorEventDlg.ErrorRetryButton.Enabled = True
        ErrorEventDlg.ErrorCancelButton.Enabled = True
        
        ErrorEventDlg.Show 1, Me
        
        If ErrorRecovery = 1 Then
            ' Continue to receive input events.
            pErrorResponse = OPOS_ER_CONTINUEINPUT
        ElseIf ErrorRecovery = 0 Then
            ' Clear all input events.
            pErrorResponse = OPOS_ER_CLEAR
        End If
    
    ElseIf ErrorLocus = OPOS_EL_INPUT Then
        DialogMessage = "Input Error" + vbCrLf + vbCrLf + "ResultCode = " + CStr(ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(ResultCodeExtended)
        ErrorEventDlg.ErrorMessageLabel.Caption = DialogMessage

        ErrorEventDlg.ErrorSuspendButton.Caption = "Suspend Process"
        ErrorEventDlg.ErrorRetryButton.Caption = "Continue Input"
        ErrorEventDlg.ErrorCancelButton.Caption = "Clear"
        ErrorEventDlg.ErrorSuspendButton.Enabled = False
        ErrorEventDlg.ErrorRetryButton.Enabled = False
        ErrorEventDlg.ErrorCancelButton.Enabled = True
        
        ErrorEventDlg.Show 1, Me
        
        ' If ErrorLocus was OPOS_EL_INPUT, the event is Last input event.
        ' ErrorResponse will unnecessary.
        
    End If

End Sub

Private Sub OPOSElectronicJournal1_OutputCompleteEvent(ByVal OutputID As Long)

    Dim DialogMessage As String
    DialogMessage = "Complete Printing Content File : ID = " + CStr(OutputID)
        
    Dim OutputCompleteEventDlg As New OutputCompleteEventDlg
    
    OutputCompleteEventDlg.Caption = "EJSample_Step4"
    OutputCompleteEventDlg.OutputCompleteEventMessageLabel.Caption = DialogMessage
    OutputCompleteEventDlg.Show 0, Me

    CompareEJOutputID OutputID
    
End Sub

Private Sub CompareEJOutputID(ByVal OutputID As Long)

    If OPOSElectronicJournal1.OutputID = OutputID Then
        EJAsyncPrinting = False
        SuspendPrintContentButton.Enabled = False
    End If

End Sub

Private Sub OPOSElectronicJournal1_StatusUpdateEvent(ByVal Data As Long)

    If Data = EJ_SUE_SUSPENDED Then
        'In suspend mode CancelPrintContent and ResumePrintContent are enabled.
        SuspendPrintContentButton.Enabled = False
        CancelPrintContentButton.Enabled = True
        ResumePrintContentButton.Enabled = True
        
    End If
    
    If Data = EJ_SUE_MEDIUM_NEAR_FULL Then
        MsgBox "ElectronicJournal Medium Near Full.", vbOKOnly, "EJSample_Step4"
    End If

End Sub

Private Sub OPOSPOSPrinter1_StatusUpdateEvent(ByVal Data As Long)

    ' Enabled SuspendPrintContent button for replace receipt paper.
    If Data = PTR_SUE_REC_NEAREMPTY Then
        MsgBox "Receipt Station Paper Near End.", vbOKOnly, "EJSample_Step4"
        NearEndDetect = True
        If (OPOSElectronicJournal1.AsyncMode = True) And (EJAsyncPrinting = True) Then
            SuspendPrintContentButton.Enabled = True
        End If

    End If
    
    If Data = PTR_SUE_REC_PAPEROK Then
        NearEndDetect = False
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
        
        If (.AsyncMode = True) Then
            EJAsyncPrinting = True
        End If
        If (EJAsyncPrinting = True) And (.ResultCode = OPOS_SUCCESS) And (NearEndDetect = True) Then
            SuspendPrintContentButton.Enabled = True
        End If

    End With

End Sub

Private Sub QueryContentButton_Click()

    With OPOSElectronicJournal1
        .QueryContent FileNameEdit.Text, StartMarkerEdit.Text, EndMarkerEdit.Text

        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Failed to Create ElectronicJournalFile. " + vbCrLf + "ResultCode = " + CStr(.ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(.ResultCodeExtended)
        End If
    End With

End Sub

Private Sub ResumePrintContentButton_Click()
    
    ' Extract storage content by from marker to marker.
    With OPOSElectronicJournal1
        .ResumePrintContent

        If .ResultCode = OPOS_SUCCESS Then
            ' SuspendMode end.
            ResumePrintContentButton.Enabled = False
            CancelPrintContentButton.Enabled = False
            SuspendPrintContentButton.Enabled = True

        Else
            MsgBox "Failed to Resume print." + vbCrLf + "ResultCode = " + CStr(.ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(.ResultCodeExtended)
        
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

Private Sub SuspendPrintContentButton_Click()

    ' ElectronicJournal storage Start / Stop
    With OPOSElectronicJournal1
        .SuspendPrintContent

        If .ResultCode = OPOS_SUCCESS Then
            SuspendPrintContentButton.Enabled = False
        
        Else
            MsgBox "Failed to Suspend print." + vbCrLf + "ResultCode = " + CStr(.ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(.ResultCodeExtended)
        
        End If
        
    End With
End Sub
