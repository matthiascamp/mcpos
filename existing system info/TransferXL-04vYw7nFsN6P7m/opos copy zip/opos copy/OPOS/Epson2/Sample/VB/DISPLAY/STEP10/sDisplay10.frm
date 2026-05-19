VERSION 5.00
Object = "{CCB90100-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSLineDisplay.ocx"
Begin VB.Form Step10 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 10 External character registration"
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
      Caption         =   "External Character Registration"
      Height          =   450
      Left            =   120
      TabIndex        =   0
      Top             =   840
      Width           =   2715
   End
   Begin OposLineDisplay_CCOCtl.OPOSLineDisplay OPOSLineDisplay1 
      Left            =   3600
      OleObjectBlob   =   "sDisplay10.frx":0000
      Top             =   840
   End
End
Attribute VB_Name = "Step10"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Step 10 Display characters.
Option Explicit

Private Sub cmdExit_Click()

    Unload Me

End Sub

Private Sub Command1_Click()
    
    'It confirms whether to correspond to DefineGlyph.
    If OPOSLineDisplay1.CapCustomGlyph Then
        With OPOSLineDisplay1
            'External character registration is carried out.
            .BinaryConversion = OPOS_BC_NIBBLE
            .DefineGlyph 95, "08041209040201"                           '//
            'Case DM-D500
            '.DefineGlyph 95, "00081<3663637?7?6363630000000000"        'A
            .BinaryConversion = OPOS_BC_NONE
    
            'The registered character is displayed.
            .DisplayTextAt 0, 10, "_", DISP_DT_NORMAL
        End With
    Else
        'Nothing is carried out if it does not correspond.
    End If
    
End Sub

Private Sub Form_Load()

    With OPOSLineDisplay1
        .Open "Unit1"
        .ClaimDevice 1000
        If .CapPowerReporting <> OPOS_PR_NONE Then
            .PowerNotify = OPOS_PN_ENABLED
        End If
        .DeviceEnabled = True
    End With

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSLineDisplay1
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

End Sub

