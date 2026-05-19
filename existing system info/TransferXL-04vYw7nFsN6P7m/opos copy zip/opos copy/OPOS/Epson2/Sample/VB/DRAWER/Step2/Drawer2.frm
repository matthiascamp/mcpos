VERSION 5.00
Object = "{CCB90040-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSCashDrawer.ocx"
Begin VB.Form Step2 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 2 Check the status of the cash drawer."
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
   Begin VB.CommandButton Command1 
      Caption         =   "Open"
      Height          =   450
      Left            =   420
      TabIndex        =   0
      Top             =   315
      Width           =   2250
   End
   Begin VB.Frame Frame1 
      Height          =   1065
      Left            =   210
      TabIndex        =   1
      Top             =   1050
      Width           =   2640
      Begin VB.TextBox Text1 
         BackColor       =   &H8000000F&
         Height          =   270
         Left            =   945
         TabIndex        =   3
         Top             =   315
         Width           =   1065
      End
      Begin VB.TextBox Text2 
         BackColor       =   &H8000000F&
         Height          =   270
         Left            =   945
         TabIndex        =   5
         Top             =   630
         Width           =   1065
      End
      Begin VB.Label Label1 
         Caption         =   "Status"
         Height          =   225
         Left            =   315
         TabIndex        =   2
         Top             =   315
         Width           =   645
      End
      Begin VB.Label Label2 
         Caption         =   "Power"
         Height          =   225
         Left            =   315
         TabIndex        =   4
         Top             =   630
         Width           =   645
      End
   End
   Begin OposCashDrawer_CCOCtl.OPOSCashDrawer OPOSCashDrawer1 
      Left            =   3600
      OleObjectBlob   =   "Drawer2.frx":0000
      Top             =   600
   End
End
Attribute VB_Name = "Step2"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Step 2 Check the status of the cash drawer.

Option Explicit

Private Sub cmdExit_Click()

    Unload Me

End Sub

'Open a drawer
'
Private Sub Command1_Click()

'Open a drawer
    OPOSCashDrawer1.OpenDrawer

End Sub

Private Sub Form_Load()

    With OPOSCashDrawer1
        .Open "Unit1"
        .ClaimDevice 1000
        
        ' If support the CapPowerReporting, enable the Power Reporting Requirements.
        If .CapPowerReporting <> OPOS_PR_NONE Then
            .PowerNotify = OPOS_PN_ENABLED
        End If
        
        .DeviceEnabled = True
    End With

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

