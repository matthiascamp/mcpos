VERSION 5.00
Object = "{CCB90040-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSCashDrawer.ocx"
Begin VB.Form Step3 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 3 Adding error handlers."
   ClientHeight    =   2550
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   4530
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   2550
   ScaleWidth      =   4530
   Begin VB.CommandButton cmdExit 
      Caption         =   "Close"
      Height          =   345
      Left            =   3360
      TabIndex        =   6
      Top             =   105
      Width           =   990
   End
   Begin VB.Frame Frame1 
      Height          =   1065
      Left            =   210
      TabIndex        =   1
      Top             =   1050
      Width           =   2640
      Begin VB.TextBox Text2 
         BackColor       =   &H8000000F&
         Height          =   270
         Left            =   945
         Locked          =   -1  'True
         TabIndex        =   5
         Top             =   630
         Width           =   1065
      End
      Begin VB.TextBox Text1 
         BackColor       =   &H8000000F&
         Height          =   270
         Left            =   945
         Locked          =   -1  'True
         TabIndex        =   3
         Top             =   315
         Width           =   1065
      End
      Begin VB.Label Label2 
         Caption         =   "Power"
         Height          =   225
         Left            =   315
         TabIndex        =   4
         Top             =   630
         Width           =   645
      End
      Begin VB.Label Label1 
         Caption         =   "Status"
         Height          =   225
         Left            =   315
         TabIndex        =   2
         Top             =   315
         Width           =   645
      End
   End
   Begin VB.CommandButton Command1 
      Caption         =   "Open"
      Height          =   450
      Left            =   420
      TabIndex        =   0
      Top             =   315
      Width           =   2250
   End
   Begin OposCashDrawer_CCOCtl.OPOSCashDrawer OPOSCashDrawer1 
      Left            =   3600
      OleObjectBlob   =   "Drawer3.frx":0000
      Top             =   720
   End
End
Attribute VB_Name = "Step3"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Step 3 Adding error handlers.
Option Explicit

Private Sub cmdExit_Click()

    Unload Me

End Sub

'Open a drawer
'
Private Sub Command1_Click()

    OPOSCashDrawer1.OpenDrawer
    Select Case OPOSCashDrawer1.ResultCodeExtended
        Case OPOS_EPTR_COVER_OPEN
            MsgBox "OpenDrawer Error" + vbCrLf + "Printer Cover Open"
        Case OPOS_EPTR_JRN_EMPTY
            MsgBox "OpenDrawer Error" + vbCrLf + "Printer Journal Empty"
        Case OPOS_EPTR_REC_EMPTY
            MsgBox "OpenDrawer Error" + vbCrLf + "Printer Receipt Empty"
        Case Else
            If (OPOSCashDrawer1.ResultCode <> OPOS_SUCCESS) Then
                MsgBox "OpenDrawer Error"
            End If
    End Select

End Sub

Private Sub Form_Load()

    With OPOSCashDrawer1
        .Open "Unit1"
        ' Error check
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "This device has not been registered, or cannot use."
            GoTo LoadError
        End If
        
        .ClaimDevice 1000
        ' Error check
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to get the exclusive right for the device."
            GoTo LoadError
        End If
        
        ' If support the CapPowerReporting, enable the Power Reporting Requirements.
        If .CapPowerReporting <> OPOS_PR_NONE Then
            .PowerNotify = OPOS_PN_ENABLED
        End If
        
        .DeviceEnabled = True
        ' Error check
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Now the device is disable to use."
            GoTo LoadError
        End If
        
        ' Check whether enable to monitor the drawer open/close status, or not.
        If .CapStatus = True Then
            ' Disable to monitor
            Frame1.Enabled = False
        End If
    End With

    Exit Sub

LoadError:
' Nothing can be used.
    Dim OBJ As Object
    'All objects on the form
    For Each OBJ In Me
        'Invalid exept for OPOS OCX
        If OBJ.Name <> "OPOSCashDrawer1" Then
            OBJ.Enabled = False
        End If
    Next
    cmdExit.Enabled = True              'Only the exit button is enabled.

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSCashDrawer1
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

End Sub

Private Sub OPOSCashDrawer1_StatusUpdateEvent(ByVal Data As Long)

    Select Case Data
    Case CASH_SUE_DRAWERCLOSED          'Drawer is closed
        Text1.Text = "Close"
    Case CASH_SUE_DRAWEROPEN            'Drawer is opened
        Text1.Text = "Open"
'The Power Reporting Requirements fires the event when the device power status is changed.
    Case OPOS_SUE_POWER_ONLINE          ' The device is powered on.
        Text2.Text = "ready"
    Case OPOS_SUE_POWER_OFF             ' The device is powered off, or unconnected.
        Text2.Text = "OFF"
    Case OPOS_SUE_POWER_OFFLINE         ' The device is powered on, but disable to operate.
        Text2.Text = "not ready"
    Case OPOS_SUE_POWER_OFF_OFFLINE     ' The device is powered off or off-line.
        Text2.Text = "Offline"
    End Select
End Sub

