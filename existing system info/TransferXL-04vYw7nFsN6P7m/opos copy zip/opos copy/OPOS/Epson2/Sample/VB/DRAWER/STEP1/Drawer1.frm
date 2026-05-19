VERSION 5.00
Object = "{CCB90040-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSCashDrawer.ocx"
Begin VB.Form Step1 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 1 Open cash drawer."
   ClientHeight    =   1485
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   4530
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   1485
   ScaleWidth      =   4530
   Begin VB.CommandButton Command1 
      Caption         =   "Open"
      Height          =   450
      Left            =   420
      TabIndex        =   1
      Top             =   315
      Width           =   2250
   End
   Begin VB.CommandButton cmdExit 
      Caption         =   "Close"
      Height          =   345
      Left            =   3360
      TabIndex        =   0
      Top             =   105
      Width           =   990
   End
   Begin OposCashDrawer_CCOCtl.OPOSCashDrawer OPOSCashDrawer1 
      Left            =   3600
      OleObjectBlob   =   "Drawer1.frx":0000
      Top             =   600
   End
End
Attribute VB_Name = "Step1"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Step 1 Open cash drawer.
Option Explicit

Private Sub cmdExit_Click()

    Unload Me

End Sub


'Open a drawer, and wait for closed
'
Private Sub Command1_Click()

    Me.MousePointer = vbHourglass
    Command1.Enabled = False

'Open the drawer using the OpenDrawer method.
    OPOSCashDrawer1.OpenDrawer

' When the drawer is not closed in ten seconds after opening, beep until closed.
' If executed the method, no values are returned until the drawer is closed.
    OPOSCashDrawer1.WaitForDrawerClose 10000, 2000, 100, 1000

    Command1.Enabled = True
    Me.MousePointer = vbDefault

End Sub

Private Sub Form_Load()

    With OPOSCashDrawer1
        'Open the device
        'Use a Logical Device Name which has been set on the SetupPOS.
        .Open "Unit1"
        
        'Get the exclusive control right for the opened device.
        'Then the device is disable from other application.
        
        '(Notice:When using an old CO, use the Claim.)
        .ClaimDevice 1000
        
        'Enable the device.
        .DeviceEnabled = True
    End With

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSCashDrawer1
        'Cancel the device
        .DeviceEnabled = False
        
        'Release the device exclusive control right.
        '(Notice:When using an old CO, use the Release.)
        .ReleaseDevice
        
        'Finish using the device.
        .Close
    End With

End Sub

