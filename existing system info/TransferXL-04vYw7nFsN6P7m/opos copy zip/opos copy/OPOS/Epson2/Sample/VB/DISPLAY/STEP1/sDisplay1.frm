VERSION 5.00
Object = "{CCB90100-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSLineDisplay.ocx"
Begin VB.Form Step1 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 1 Display characters."
   ClientHeight    =   1710
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   4635
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   1710
   ScaleWidth      =   4635
   Begin VB.CommandButton cmdExit 
      Caption         =   "Close"
      Height          =   345
      Left            =   3465
      TabIndex        =   1
      Top             =   105
      Width           =   990
   End
   Begin VB.CommandButton Command1 
      Caption         =   "Text display"
      Height          =   450
      Left            =   840
      TabIndex        =   0
      Top             =   525
      Width           =   1515
   End
   Begin OposLineDisplay_CCOCtl.OPOSLineDisplay OPOSLineDisplay1 
      Left            =   3720
      OleObjectBlob   =   "sDisplay1.frx":0000
      Top             =   600
   End
End
Attribute VB_Name = "Step1"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Step 1 Display characters.
Option Explicit

Private Sub cmdExit_Click()

    Unload Me

End Sub

Private Sub Command1_Click()

    OPOSLineDisplay1.DisplayText "Hello OPOS.", DISP_DT_NORMAL

End Sub

Private Sub Form_Load()

    With OPOSLineDisplay1
        'Open the device
        'Use a Logical Device Name which has been set on the SetupPOS.
        .Open "Unit1"
        
        'Get the exclusive control right for the opened device.
        'Then the device is disable from other application.
        
        '(Notice:When using an old CO, use the Claim.)
        .ClaimDevice 1000
        
        ' If support the CapPowerReporting, enable the Power Reporting Requirements.
        If .CapPowerReporting <> OPOS_PR_NONE Then
            .PowerNotify = OPOS_PN_ENABLED
        End If
        
        'Enable the device.
        .DeviceEnabled = True
    End With

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSLineDisplay1
        'Cancel the device
        .DeviceEnabled = False
        
        'Release the device exclusive control right.
        '(Notice:When using an old CO, use the Release.)
        .ReleaseDevice
        
        'Finish using the device.
        .Close
    End With

End Sub

