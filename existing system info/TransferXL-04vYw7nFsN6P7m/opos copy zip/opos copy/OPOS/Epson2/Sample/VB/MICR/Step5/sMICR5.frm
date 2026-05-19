VERSION 5.00
Object = "{CCB90110-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSMICR.ocx"
Object = "{CCB90150-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSPOSPrinter.ocx"
Begin VB.Form Step5 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 5  Adding a function printing on the other side of the slip."
   ClientHeight    =   4440
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   6615
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   4440
   ScaleWidth      =   6615
   Begin VB.CommandButton Command3 
      Caption         =   "Print"
      Height          =   435
      Left            =   1995
      TabIndex        =   21
      Top             =   3675
      Width           =   1275
   End
   Begin VB.TextBox Text9 
      Height          =   285
      Left            =   1995
      TabIndex        =   19
      Top             =   2940
      Width           =   1485
   End
   Begin VB.TextBox Text8 
      Height          =   285
      Left            =   1995
      TabIndex        =   17
      Top             =   2625
      Width           =   1485
   End
   Begin VB.TextBox Text7 
      Height          =   285
      Left            =   1995
      TabIndex        =   15
      Top             =   2310
      Width           =   1485
   End
   Begin VB.TextBox Text6 
      Height          =   285
      Left            =   1995
      TabIndex        =   13
      Top             =   1995
      Width           =   1485
   End
   Begin VB.TextBox Text5 
      Height          =   285
      Left            =   1995
      TabIndex        =   11
      Top             =   1680
      Width           =   1485
   End
   Begin VB.TextBox Text4 
      Height          =   285
      Left            =   1995
      TabIndex        =   9
      Top             =   1365
      Width           =   1485
   End
   Begin VB.TextBox Text3 
      Height          =   285
      Left            =   1995
      TabIndex        =   7
      Top             =   1050
      Width           =   1485
   End
   Begin VB.TextBox Text2 
      Height          =   285
      Left            =   1995
      TabIndex        =   4
      Top             =   735
      Width           =   1485
   End
   Begin VB.CommandButton Command2 
      Caption         =   "Remove"
      Height          =   435
      Left            =   3675
      TabIndex        =   3
      Top             =   3675
      Width           =   1275
   End
   Begin VB.CommandButton Command1 
      Caption         =   "Insert"
      Height          =   435
      Left            =   315
      TabIndex        =   2
      Top             =   3675
      Width           =   1275
   End
   Begin VB.TextBox Text1 
      Height          =   285
      Left            =   1260
      TabIndex        =   1
      Top             =   210
      Width           =   3165
   End
   Begin VB.CommandButton cmdExit 
      Caption         =   "Exit"
      Height          =   345
      Left            =   5160
      TabIndex        =   0
      Top             =   105
      Width           =   1200
   End
   Begin OposMICR_CCOCtl.OPOSMICR OPOSMICR1 
      Left            =   5880
      OleObjectBlob   =   "sMICR5.frx":0000
      Top             =   840
   End
   Begin OposPOSPrinter_CCOCtl.OPOSPOSPrinter OPOSPOSPrinter1 
      Left            =   5280
      OleObjectBlob   =   "sMICR5.frx":0024
      Top             =   840
   End
   Begin VB.Label Label9 
      Alignment       =   1  'Right Justify
      Caption         =   "TransitNumber"
      Height          =   225
      Left            =   420
      TabIndex        =   20
      Top             =   2940
      Width           =   1485
   End
   Begin VB.Label Label8 
      Alignment       =   1  'Right Justify
      Caption         =   "SerialNumber"
      Height          =   225
      Left            =   420
      TabIndex        =   18
      Top             =   2625
      Width           =   1485
   End
   Begin VB.Label Label7 
      Alignment       =   1  'Right Justify
      Caption         =   "EPC"
      Height          =   225
      Left            =   420
      TabIndex        =   16
      Top             =   2310
      Width           =   1485
   End
   Begin VB.Label Label6 
      Alignment       =   1  'Right Justify
      Caption         =   "CountryCode"
      Height          =   225
      Left            =   420
      TabIndex        =   14
      Top             =   1995
      Width           =   1485
   End
   Begin VB.Label Label5 
      Alignment       =   1  'Right Justify
      Caption         =   "CheckType"
      Height          =   225
      Left            =   420
      TabIndex        =   12
      Top             =   1680
      Width           =   1485
   End
   Begin VB.Label Label4 
      Alignment       =   1  'Right Justify
      Caption         =   "BankNumber"
      Height          =   225
      Left            =   420
      TabIndex        =   10
      Top             =   1365
      Width           =   1485
   End
   Begin VB.Label Label3 
      Alignment       =   1  'Right Justify
      Caption         =   "Amount"
      Height          =   225
      Left            =   420
      TabIndex        =   8
      Top             =   1050
      Width           =   1485
   End
   Begin VB.Label Label2 
      Alignment       =   1  'Right Justify
      Caption         =   "AccountNumber"
      Height          =   225
      Left            =   420
      TabIndex        =   6
      Top             =   735
      Width           =   1485
   End
   Begin VB.Label Label1 
      Alignment       =   1  'Right Justify
      Caption         =   "RawData"
      Height          =   225
      Left            =   210
      TabIndex        =   5
      Top             =   210
      Width           =   960
   End
End
Attribute VB_Name = "Step5"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
' Step 5  Adding a function printing on the other side of the slip.
Option Explicit

Private Sub cmdExit_Click()

    Unload Me

End Sub

Private Sub Command1_Click()

    Dim ret As Long

    Do
        ret = OPOSMICR1.BeginInsertion(3000)
        If ret = OPOS_SUCCESS Then
            Exit Do
        ElseIf ret = OPOS_E_TIMEOUT Then
            If (MsgBox("Please insert a check.", vbOKCancel + vbQuestion) = vbCancel) Then
                OPOSMICR1.EndInsertion
                Exit Sub
            End If
        Else
            MsgBox "insert error."
            Exit Do
        End If
    Loop

    OPOSMICR1.EndInsertion

End Sub

Private Sub Command2_Click()

    Dim ret As Long
    Dim i As Integer

    ret = OPOSMICR1.BeginRemoval(3000)
    If ret = OPOS_E_TIMEOUT Then
        MsgBox "Please remove a check."
    ElseIf ret <> OPOS_SUCCESS Then
        MsgBox "remove error."
        Exit Sub
    End If

    i = 1
    Do While OPOSMICR1.EndRemoval <> OPOS_SUCCESS
        MsgBox "Please remove a check."
        ' error message is 5 Limit
        i = i + 1
        If i = 5 Then Exit Do
    Loop

End Sub

Private Sub Command3_Click()

    Dim fDate As String

    ' Begining Process
    fDate = Format(Now, "hh:mm AM/PM   d mmm, yyyy")
    ' Endorse printout
    With OPOSPOSPrinter1
        ' Select the reverse side
        .ChangePrintSide PTR_PS_SIDE2

        .PrintNormal PTR_S_SLIP, vbLf
        .PrintNormal PTR_S_SLIP, Chr(&H1B) & "|rADATE" & fDate & vbLf
        .PrintNormal PTR_S_SLIP, Chr(&H1B) & "|rA" & "SEIKO EPSON CORPORATION" & vbLf
    End With

End Sub

Private Sub Form_Load()

    With OPOSMICR1
        .Open "Unit1"
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "This device has not been registered, or cannot use."
            GoTo LoadError
        End If
        
        .ClaimDevice 1000
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to get the exclusive right for the device."
            GoTo LoadError
        End If
        
        If .CapPowerReporting <> OPOS_PR_NONE Then
            .PowerNotify = OPOS_PN_ENABLED
        End If
        
        .DeviceEnabled = True
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Now the device is disable to use."
            GoTo LoadError
        End If
        
        .DataEventEnabled = True
    End With

    With OPOSPOSPrinter1
        .Open "Unit1"
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "This device has not been registered, or cannot use."
            GoTo LoadError
        End If
        
        .ClaimDevice 1000
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to get the exclusive right for the device."
            GoTo LoadError
        End If
        
        .DeviceEnabled = True
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Now the device is disable to use."
            GoTo LoadError
        End If
        
    '<APG1.5>
    'Confirm whether supporting printing both sides, or not.
        If .CapSlpBothSidesPrint = False Then
            MsgBox "The device does not support for printing both sides. Fails to operate the step."
            Command3.Enabled = False
        End If
    End With

    Exit Sub

LoadError:
    Dim OBJ As Object
    For Each OBJ In Me
        If (OBJ.Name <> "OPOSMICR1") And (OBJ.Name <> "OPOSPOSPrinter1") Then
            OBJ.Enabled = False
        End If
    Next
    cmdExit.Enabled = True              'Only the exit button is enabled.

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSPOSPrinter1
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

    With OPOSMICR1
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

End Sub

Private Sub OPOSMICR1_DataEvent(ByVal Status As Long)

    Dim sBuf As String

    With OPOSMICR1
        Text1.Text = .RawData
        Text2.Text = .AccountNumber
        Text3.Text = .Amount
        Text4.Text = .BankNumber
        
        Select Case .CheckType
        Case MICR_CT_PERSONAL:      sBuf = "PERSONAL"
        Case MICR_CT_BUSINESS:      sBuf = "BUSINESS"
        Case MICR_CT_UNKNOWN:       sBuf = "UNKNOWN"
        End Select
        Text5.Text = sBuf
        
        Select Case .CountryCode
        Case MICR_CC_USA:           sBuf = "USA"
        Case MICR_CC_CANADA:        sBuf = "CANADA"
        Case MICR_CC_MEXICO:        sBuf = "MEXICO"
        Case MICR_CC_UNKNOWN:       sBuf = "UNKNOWN"
        End Select
        Text6.Text = sBuf
        
        Text7.Text = .EPC
        Text8.Text = .SerialNumber
        Text9.Text = .TransitNumber
    
        .DataEventEnabled = True
    End With

End Sub

Private Sub OPOSMICR1_ErrorEvent(ByVal ResultCode As Long, ByVal ResultCodeExtended As Long, ByVal ErrorLocus As Long, pErrorResponse As Long)

    MsgBox "MICR Error!" + vbCrLf + vbCrLf + "ResultCode = " + CStr(ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(ResultCodeExtended)

End Sub

Private Sub OPOSMICR1_StatusUpdateEvent(ByVal Data As Long)

'The Power Reporting Requirements fires the event when the device power status is changed.
    Select Case Data
    Case OPOS_SUE_POWER_ONLINE          ' The device is powered on.
        MsgBox "The device is powered on."
    Case OPOS_SUE_POWER_OFF             ' The device is powered off, or unconnected.
        MsgBox "The device is powered off, or unconnected."
    Case OPOS_SUE_POWER_OFFLINE         ' The device is powered on, but disable to operate.
        MsgBox "The device is powered on, but disable to operate.."
    Case OPOS_SUE_POWER_OFF_OFFLINE     ' The device is powered off or off-line.
        MsgBox "The device is powered on or off-line."
    End Select

End Sub
